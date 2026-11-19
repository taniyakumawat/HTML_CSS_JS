/* =========================================================
   Calculator logic — no eval(), uses a real expression parser
   ========================================================= */
(function () {
    'use strict';

    var displayValue = document.getElementById('displayValue');
    var historyEl = document.getElementById('history');
    var keypad = document.getElementById('keypad');

    var MAX_LENGTH = 24;
    var OPERATORS = '+-*/';
    var NUMERIC = '0123456789.';

    // --- State -------------------------------------------------
    var expression = '';      // what the user is typing, e.g. "12.5*3"
    var justEvaluated = false; // last key pressed was "="
    var errorState = false;   // display currently shows "Error"

    /* =======================================================
       Expression parser: tokenize -> recursive descent
       Supports: + - * / % ( ) and decimal numbers
       ======================================================= */
    function tokenize(src) {
        var tokens = [];
        var i = 0;

        while (i < src.length) {
            var char = src[i];

            if (char === ' ') {
                i++;
                continue;
            }

            if (NUMERIC.indexOf(char) !== -1) {
                var start = i;
                while (i < src.length && NUMERIC.indexOf(src[i]) !== -1) {
                    i++;
                }
                var raw = src.slice(start, i);
                if ((raw.match(/\./g) || []).length > 1 || raw === '.') {
                    throw new SyntaxError('Invalid number');
                }
                tokens.push({ type: 'number', value: parseFloat(raw) });
                continue;
            }

            if (OPERATORS.indexOf(char) !== -1 || char === '%' || char === '(' || char === ')') {
                tokens.push({ type: 'operator', value: char });
                i++;
                continue;
            }

            throw new SyntaxError('Unexpected character');
        }

        return tokens;
    }

    function parse(tokens) {
        var pos = 0;

        function peek() {
            return tokens[pos];
        }

        function eat(value) {
            if (peek() && peek().value === value) {
                pos++;
                return true;
            }
            return false;
        }

        // expr := term (('+' | '-') term)*
        function parseExpression() {
            var left = parseTerm();
            while (peek() && (peek().value === '+' || peek().value === '-')) {
                var op = tokens[pos++].value;
                var right = parseTerm();
                left = op === '+' ? left + right : left - right;
            }
            return left;
        }

        // term := unary (('*' | '/') unary)*
        function parseTerm() {
            var left = parseUnary();
            while (peek() && (peek().value === '*' || peek().value === '/')) {
                var op = tokens[pos++].value;
                var right = parseUnary();
                if (op === '/') {
                    if (right === 0) {
                        throw new Error('Cannot divide by zero');
                    }
                    left = left / right;
                } else {
                    left = left * right;
                }
            }
            return left;
        }

        // unary := ('-' | '+') unary | postfix
        function parseUnary() {
            if (peek() && (peek().value === '-' || peek().value === '+')) {
                var op = tokens[pos++].value;
                var value = parseUnary();
                return op === '-' ? -value : value;
            }
            return parsePostfix();
        }

        // postfix := primary '%'*
        function parsePostfix() {
            var value = parsePrimary();
            while (peek() && peek().value === '%') {
                pos++;
                value = value / 100;
            }
            return value;
        }

        // primary := number | '(' expression ')'
        function parsePrimary() {
            var token = peek();
            if (!token) {
                throw new SyntaxError('Unexpected end of expression');
            }
            if (token.type === 'number') {
                pos++;
                return token.value;
            }
            if (token.value === '(') {
                pos++;
                var value = parseExpression();
                if (!eat(')')) {
                    throw new SyntaxError('Missing closing parenthesis');
                }
                return value;
            }
            throw new SyntaxError('Unexpected token');
        }

        var result = parseExpression();
        if (pos !== tokens.length) {
            throw new SyntaxError('Trailing characters');
        }
        return result;
    }

    function evaluate(source) {
        var result = parse(tokenize(source));

        if (!isFinite(result)) {
            throw new Error('Cannot divide by zero');
        }

        // Kill floating point noise like 0.1 + 0.2 => 0.30000000000000004
        var rounded = parseFloat(result.toPrecision(12));
        return Object.is(rounded, -0) ? '0' : String(rounded);
    }

    /* =======================================================
       Rendering
       ======================================================= */
    function render() {
        displayValue.value = expression === '' ? '0' : expression;
        // Keep the newest characters visible on narrow screens
        displayValue.scrollLeft = displayValue.scrollWidth;
    }

    function showError(message) {
        errorState = true;
        expression = '';
        justEvaluated = false;
        displayValue.value = 'Error';
        historyEl.textContent = message || '';
    }

    function reset() {
        expression = '';
        justEvaluated = false;
        errorState = false;
        historyEl.textContent = '';
        render();
    }

    /* =======================================================
       Input handling
       ======================================================= */
    function currentNumber() {
        var match = expression.match(/[0-9.]*$/);
        return match ? match[0] : '';
    }

    function appendValue(value) {
        var startsNumber = NUMERIC.indexOf(value[0]) !== -1;

        // Recover from an error with a fresh number (or a leading minus)
        if (errorState) {
            if (!startsNumber && value !== '-') {
                return;
            }
            reset();
        }

        // A fresh number after "=" starts a new calculation
        if (justEvaluated) {
            if (startsNumber) {
                expression = '';
            }
            justEvaluated = false;
            historyEl.textContent = '';
        }

        var lastChar = expression.slice(-1);

        // Starting from an empty display: accept a number or a leading minus,
        // ignore operators like +, *, % that would have no meaning yet.
        if (expression === '') {
            if (value === '-') {
                expression = '-';
            } else if (startsNumber) {
                expression = value === '00' ? '0' : (value === '.' ? '0.' : value);
            } else {
                return;
            }
            render();
            return;
        }

        // One operator at a time: replace the previous one
        if (OPERATORS.indexOf(value) !== -1 && OPERATORS.indexOf(lastChar) !== -1) {
            expression = expression.slice(0, -1) + value;
            render();
            return;
        }

        // Only one decimal point per number
        if (value === '.' && currentNumber().indexOf('.') !== -1) {
            return;
        }

        if (expression.length >= MAX_LENGTH) {
            return;
        }

        expression += value;
        render();
    }

    function backspace() {
        if (errorState) {
            reset();
            return;
        }
        if (justEvaluated) {
            justEvaluated = false;
        }
        expression = expression.slice(0, -1);
        render();
    }

    function equals() {
        if (errorState || expression === '' || justEvaluated) {
            return;
        }

        var source = expression;
        var sourceForDisplay = source.replace(/\//g, '÷').replace(/\*/g, '×');

        try {
            var result = evaluate(source);
            historyEl.textContent = sourceForDisplay + ' =';
            expression = result;
            justEvaluated = true;
            render();
        } catch (err) {
            showError(err.message);
        }
    }

    function handleInput(dataset) {
        if (dataset.action === 'clear') {
            reset();
        } else if (dataset.action === 'back') {
            backspace();
        } else if (dataset.action === 'equals') {
            equals();
        } else if (dataset.value) {
            appendValue(dataset.value);
        }
    }

    /* =======================================================
       Events: mouse / touch + keyboard
       ======================================================= */
    keypad.addEventListener('click', function (event) {
        var button = event.target.closest('button');
        if (!button) {
            return;
        }
        handleInput(button.dataset);
    });

    function flash(selector) {
        var button = document.querySelector(selector);
        if (!button) {
            return;
        }
        button.classList.add('is-active');
        setTimeout(function () {
            button.classList.remove('is-active');
        }, 120);
    }

    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        var key = event.key;

        if (/^[0-9.]$/.test(key)) {
            appendValue(key);
            flash('[data-value="' + key + '"]');
        } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '%') {
            appendValue(key);
            flash('[data-value="' + key + '"]');
        } else if (key === 'Enter' || key === '=') {
            event.preventDefault();
            equals();
            flash('[data-action="equals"]');
        } else if (key === 'Backspace') {
            event.preventDefault();
            backspace();
            flash('[data-action="back"]');
        } else if (key === 'Escape' || key === 'Delete') {
            reset();
            flash('[data-action="clear"]');
        } else if (key === '(' || key === ')') {
            // Supported by the parser, handy for typing
            appendValue(key);
        } else {
            return;
        }

        event.preventDefault();
    });

    render();
})();
