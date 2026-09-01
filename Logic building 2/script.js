// VARIABLES = var,let, const with declaration and initilaizad
// var always connectes it's varible with windows 
// var is function scoped  
// declared again and again 
// old version don't use 

// var a = 11; 
// var a = 10; // initialized 

// don't use same veriable in let 
// let a = 14;
// let a = 15; // error 

// allready know the value and can't be changed 
//const a = 16;  



// SCOPE (global, block, functional)

// var a = 12; // Global Scope -> scope inside ,outside this '{}' and full code 
// let b = 100; // block scope -> use only inside the curly brackets '{}'



// RE-ASSIGNMENT , RE-DECLARATION
// var a = 5;
// a = 6; // possible reassign , also called update  
// var a = 10; // possible redeclaration 

// let b = 7;
// b = 14; // possible reassign 
// let b = 20; // not possible redeclaration 


//var a = 10;
// {
//     var a = 20;
// }
// console.log(a);


// let b = 30;
// {
//     let c = 40;
//     console.log(c);
// }
// console.log(b);


//                                           OPERATORS
// let a = 10;
// let b = a + 2;
// console.log(a);
// console.log(b);


//                                    
// let a = 13;
// a = true;

// let a = 12;
// console.log(a);
// a+=3;
// console.log(a);

// a-=11;
// console.log(a);

// a*=2;
// console.log(a);

// a%=4;
// console.log(a);

//  12 > 13 ? console.log("true") : console.log("false");
  

// let x = 10;
// let y = 20;

// if (x > 5 && y < 25)
// {
//     console.log("A");
// }
// else
// {
//     console.log("B");
// }


// let hello = true;
// let by = false;

// if (hello || by)
// {
//     console.log("YES");
// }
// else 
// {
//     console.log("NO");
// }


// let temp = 35;

// if(!(temp < 30))
// {
//     console.log("warm");
// }
// else{
//     console.log("cool");
// }


// let a = 0;

// if (a)
// {
//     console.log("true")
// }
// else{
//     console.log("false");
// }

// let score = 100;

// let grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "false";

// console.log(grade);

// let A = true;
// let B = false;

// let access = A && B ? "allow" : "deny";

// console.log(access);



//  let x = 3;
//  let y = x++;
//  let z = y++; // z = x++
//  console.log(x,y,z);  

// let p = 4;
// let q = ++p;
// console.log(p, q);

// let n = 10;
// console.log(n--);// 10
// console.log(n);// 9

// let m = 5;
// let result = m++ + ++m;// m++ = 5 , it means already the value was changed into 6 so the after the value of ++m that means ++m = 7
// console.log(result);// 5 + 7 = 12

// let likes = 100;
// function likepost(){
//     return ++likes;
// }

// console.log(likepost());// 101
// console.log(likes);// 101


// let count = 5;
// if (count-- === 5){
//     console.log("match");
// }
// else{
//     console.log("not match");
//}

// !!"" = false
// !!"hello" = true
// !!0 = false
// !!1 = true

// let i = 1;
// console.log(++i);//2
// console.log(i++);//2 (but i is now 3)



//                                       CONDITIONS STATEMENTS
// function getGrade(score)
// {
//     if (score>=90 && score<=100)
//     {
//         return "A+";
//     }
//     else if(score>=80 && score<=89)
//     {
//         return "A";
//     }
//     else if(score>=70 && score<=79)
//     {
//         return "B";
//     }
//     else if(score>=60 && score<=69)
//     {
//         return "C";
//     }
//     else if(score>=33 && score<=59)
//     {
//         return "D";
//     }
//     else if(score>=33 && score<=59)
//     {
//         return "FAIL";
//     }
//     else 
//     {
//         return "Invalid Marks";
//     }

// }

// console.log (getGrade(78));


// function getGrade(score)
// {
//   if(score>=90 && score<=100) return "A"; // erally return 
//   if(score>=80 && score<=89) return "B";
//   if(score>=70 && score<=79) return "C";
//   if(score>=60 && score<=69) return "D";
//   if(score>=33 && score<=59) return "E";
//   if(score>=33 && score<=59) return "F";
//   if(score>=0 && score<=32) return "FAIL";
//   return " INVALID MARKS";
// }

// console.log(getGrade(75));

// function rps(user, computer)
// {
//     if(user === "rock" && computer === "sissor") return "user";
//     if(user === "sissor" && computer === "paper") return "user";
//     if(user === "paper" && computer === "rock") return "user";
//     return "computer";
// }
// console.log(rps("rock", "sissor"));




//                                              LOOPS
// let x = 2;
// switch (x)
// {
//     case 2:
//     console.log("two");
//     case 3:
//     console.log("three");// output: two , three (bug if break is missing)
// }
    

// (1) for (initialisation; condiotio; increment/decrement){}
// (2) initialisation
//     while (condition){
//                        increment/decrement}
// (3) initialisation
//     do{
//         increment/decrement}
//     while (condition)

// for (let i = 0; i<=201; i++)
// {
//     console.log(i);
//     if (i === 32)
//     {
//         break;
//     }
// }

// for (let i = 0; i<=201; i++)
//  {
//      if (i === 20 )
//      {
//         continue;
//      }
//      console.log(i);
//  }


// for (let i = 1; i <=10; i++)
// {
//     console.log(i);
// }

// let i = 10;
// while (i>=1)
// {
//     console.log(i);
//     i--;
// }

//  for (let i = 10; i>=1; i--)
//  {
//      console.log(i)
//  }

// for (let i = 0; i<=20; i++)
// {
//     if (i%2 === 0)
//     {
//         console.log(i);
//     }
    
// }

// let i = 1;
// while(i<=15)
// {
//     if (i%2 === 1)
//     {
//         console.log(i);
//     }
//     i++;
// }

//  for (let i = 1; i<=10; i++)
//  {
//          console.log(`5 * ${i} = ${5*i}`);
//  }

// let sum = 0;
// for (let i = 1; i<=100; i++)
// {
//     sum = sum + i ;
// }
// console.log(sum);

// for(let i = 1; i<=50; i++)
// {
//     if(i%3 === 0)
//     {
//         console.log(i);
//     }
// }

// let value = prompt("give a number");

// for (let i = 1; i <= value; i++);
// {
//     if (i%2 === 0)
//     {                                      // ERROR //
//         console.log(i);
//     }
//     else
//     {
//         console.log(i);
//     }
// }

// for (let i = 1; i <= 100; i++)
// {
//     if(i%3 === 0  && i%5 === 0)
//     {
//         console.log(i);
//     }
// }

// for(let i = 1; i <= 100; i++)
// {
//     if (i%7 === 0)
//     {
//         break;
//     }
//     console.log(i);
// }

// for(let i = 1; i <= 20; i++)
// {
//     if(i%3 === 0)
//     {
//         continue;
//     }
//     console.log(i);
// }

// let number = 0;
// for (let i = 1; i <= 100; i++)
// {
//     if(i%2 === 1)
//     {
//       number++;
//       console.log(i);
//     }
//     if(number === 5) break;
    
// }




//                                      FUNCTIONS


// ->  let variable(also be a function name) = function(){
//                                                         code  }  // it called function expression 
//                                               variable();
//  ->  function functionName ()
//       {
//                   }         // it's called function  decleration
//
// 
// -> let variable(functionName) = ()=>{
//                                     write code   }  // it's called fat arrow function

// function student(v1) {
//     console.log(`${v1} hello`);
// }

// student("Taniya");
// student("Rachita");
// student("Monkey");
// student("DUDU");

// function add(v1, v2) {  // parameters
//     console.log(v1 - v2);
// }
// add(2,3);
// add(3,3);//arggument


// -> DEFAULT PARAMETERS
// function add(v1 = 2, v2 = 3) {
//     console.log(v1 + v2);
// } 
// add();

// function add(v1 = 2, v2 = 3) {
//      console.log(v1 + v2);
//  } 
//  add(5,5); // output 10


//  -> REST operator
// function functionName(...value)
// {
//     console.log(value);
// }
// functionName(1,2,3,4,5,6,7,8,9,10);


//  ->  RETURN  function
// function abcd() {
//     return 12;
// } 
// let val = abcd();
// console.log(val);

// function A() {
//     console.log("hello world2");
//     return "hello world";
// }
// console.log(A());




// -> FIRST CLASS Function => it is a concept using functions like a value

// let variable = function () {
    
// }
// variable();

//             OR

// function variable(val) {
//     console.log(val);
// }
// variable(12)

//      OR

// function variable(val) 
// {
//     val(); // calling value into parameters inside function not variable 
// }

// variable(function () { // don't write the function name
//                          console.log("hello");
//                      })



// -> HIGHER ORDER FUNCTION => it is a concept use to return a function or accept a function in it's parameters

//  function variable(val) 
//  {
//      val();// higher order function
//  }
//  variable(function() {
//      console.log("hello")// not higher order function
//  });

//  function variable() {
//      return function() {
//          console.log("hello");
//      }
//  }
//  variable()(); 


// -> PURE VS IMPURE Function => a function which don't effect outside value and a function which effects outside values
// let a = 12;

// function A() {
//     console.log("TWELVE"); // PURE Function
// }

// function B() {
//     a++; //     IMPURE Function
// }


// -> CLOSURES => ek function jo return krega ek or function , or return hone wala second function use krega parent function ke variable ko 

// function A() {
//     let a = 10;
//     return function () {
//         console.log(a);
//     }
// }
// A()();


// -> LEXICAL SCOPING function concept
//   function A() {
//      let a = 10;
//      console.log(a); // scope inside A function only not outside
//      return function() {
//          let b = a+20;
//          console.log(b); // scope inside B function only not outside A function
//          return function() {
//              let c = a+b+30; 
//              console.log(c);// scope inside C function only not outside B, A function
//          }
//      }
//   }
// console.log(A()()());



//   -> IIFE (immediately invoked function expression)
//  (function () {
//     console.log("hello world");
//  })();

 
//  -> HOISTING 

// A(); // execute easily

// function A() {
//     console.log("hello rachit");
// }

//   BUT 

// A(); // ERROR 

// let A = function () {
//     console.log("hello taniya");
// }


// QUESTIONS OF FUNCTIONS 

// A();
// function A() {       // allowed declaration in hosting
//     console.log("hi"); 
// }

// A();
// let A = function () {       //don't allowed expressions in hosting
//     console.log("hi"); 
// }

// let multiply = (a, b) =>{
//        return a * b;
// };                      // ERROR

// multiply(2,3);
  
// function sayHi(name = "guest") {
//     console.log("hi",name);
// }
// sayHi();

//  function getscore(...scores) {
//      let total = 0;
//      scores.forEach(function(val) {
//          total = total + val;
//      });
//      return total;
//  }
// console.log( getscore(10,20,30,40) );


// function checkAge(age) {
//     if(age < 18) return "too young";
//     return "Allowed";
// }
// console.log(checkAge(16));

// function f() {
//     return;
// }
// console.log(f());

// let A = function()
// {
//     return "hello world";
// }
// console.log(A());


// function A() {
//     console.log("parent functiion"); // higher order function  
//     return function () {
//         return "child function";
//     }
// }
// console.log(A()());


// function A(val) {
//     val();
// }
// A(function() {
//     console.log("hello my");
// })

// let total = 0;
// function A(num) {
//     let newTotal = total;
//     newTotal += num;
//     console.log(newTotal);
// }
// A(2);

// function A() {
//     let a = 10;
//     return function () {
//         return a;
//     };
// }
// console.log(A()());

// function outer() {
//     let num = 0;
//     return function () {
//        num++;
//        console.log(num);
//     }
// }
// const counter = outer ();
// counter();
// counter();

// (function A() {
//     console.log("IIFE (immediately invoked function expression)");
// })();

// function BMI(weight , height) {
//     return weight / (height*height);
// }
// console.log(BMI(65,1.6)); // console.log(BMI(65,1.6).toFixed(2)); // give two values after '.'

// function discountCalculator(discount) {
//     return function (price) {
//         return price - price * (discount/100);
//     };
// }
// let ten = discountCalculator(10); // discount
// let twenty = discountCalculator(20); // discount

// console.log(ten(1200)); // price
// console.log(twenty(1200)); // price


// function counter() {
//     let count = 0;
//     return function () {
//         count++;
//         return count;

//     };
// }
// let a = counter();
// console.log(a());

// function double(val) {
//     return val * 2;
// }
// console.log(double(5));


// (function A() {
//     const password = "secret password";
//     console.log(password);
// })();

// console.log(password);




//                             ARRAY

//  let marks = [10 , 20 , 30 , 40]; // create 
//  marks[0]; //   access

// let arr = [1,2,3,4];
// arr[2] = 12;   //   update/ modify array

// let arr = [1,2,3,4,5]; // push = after adding 
// arr.push(65);

// let arr = [1,2,3,4,5]; // pop = after removing
// arr.pop(); 

// let arr = [1,2,3,4,5]; // shift = before removing
// arr.shift();

// let arr = [1,2,3,4,5]; // unshift = before adding
// arr.unshift(-1);

// let arr = [1,2,3,4,5]; // splice = removing middle values , (2,1) = the first one define index no. and the second one define who many values are removing
// arr.splice(2,2); // output : [1,2,5]

// let arr = [1,2,3,4,5]; // slice
// let newarr = arr.slice(0,3); // output : arr = [1,2,3,4,5] , newarr = [1,2,3]

// let arr = [1,2,3,4,5]; // reverse
// arr.reverse();

// let arr = [10,2,30,24,15]; //      sort (accept function)
// let newarr = arr.sort(function (a,b) {
//     return a-b; // assending order a-b = [2,10,15,24,30] / dessending order opposit b-a = [30,24,15,10,2] 
// })

// let arr = [1,2,3,4,5]; //       forEach
// arr.forEach(function (value) {
//     console.log(value); // consloe.log(value + 5); output: arr = [6,7,8,9,10]
// })

// let arr = [1,2,3,4,5]; // map = use only we make a new array based on previous array data
// let newarr = arr.map(function (value) {
//     return 10;
// })

// let arr = [11,2,3,44,55]; // map
// let newarr = arr.map(function (value) {
//     if(value > 10 ) return value;
// })


// let arr = [1,2,3,4,5]; // filter = use same like the map but it takes some data from the previos array, we write only true or false
// let newarr = arr.filter(function (value) {
//     if(value > 4) return true;
// })

// let arr = [1,2,3,4,5]; //  reduce = use for array give a single value of it's datas
// let newarr = arr.reduce(function (accumulator, value) {
//     return accumulator + value;
// }, 0);                                //   (accumulator, value)
//                                         ( 0 , 1 ) = 0+1 = 1 -> accumulator
//                                         ( 1 , 2 ) = 1+2 = 3 -> accumulator
//                                         ( 3 , 3 ) = 3+3 = 6 -> accumulator
//                                         ( 6 , 4 ) = 6+4 = 10 -> accumulator


// let arr = [1,2,1,3,4,5] // find 
// let newarr = arr.find(function (value) {
//     return value === 1;
// });

// let arr = [{id:1 , key:1},
//            {id:2 , key:4},
//            {id:3 , key:1}
//           ]
// let newarr = arr.find(function (value) {
//     return value.key === 4;
// })


// let arr = [70,95,60,85] // some = use to find a unique value , a single value who satisfy the condition then it returns true
//  let newarr = arr.some(function (value) {
//      return value > 70;
//  })

// let arr = [70,95,60,85]; //  every = opposit of some all value was satisfy by condition
// let newarr = arr.every(function (value) {
//       return value > 10;
//   })

// let arr = [1,2,3,4,5] // destructuring 
// let [a,b, ,c] = arr; // a = 1, b = 2, c = 4

// let arr = [1,2,3,4,5]; // spread operator = use to copy into a new array
// let arr2 = [...arr];


//  QUESTIONS

// let fruit = ["apple", "mango", "banana"];
// fruit[1];


// let fruit = ["apple", "banana"]
// fruit.unshift("pineapple");
// fruit.push("mango");

// let fruit = ["apple", "banana"]
// fruit.pop();
// fruit.push("kiwi");


// let color = ["green", "yellow"];
// color. splice(1,0,"red","blue");

// let names = ["khushi", "taniya", "babita"];
// names.sort().reverse();

// let arr = [1,2,3,4,5];
// let newarr = arr.map(function (val) {
//     return val*val;
// })

// let arr = [1,2,3,4,5];
//  let newarr = arr.filter(function (val) {
//      return val>3;
//  })

// let a = [1,2];
// let b = [3,4];
// let c = [...a, ...b];

// let add = ["USA", "UK"];
// add = ["INDIA", ...add];




//                                 OBJECTS


// let obj = {                 // syntax 
//     name: "taniya",         // obj.name  => accessing data from obj  // called key value structure
//     age: 15,                // obj.age
//     course: "BCA",           // obj.course
// };
// obj.name;
// obj['name']

// let name = "tannu";
// obj.name              // ERROR

// let name = "tannu";

//  NESTING AND DEEP ACCESS
// const user = {
//     name:"tanu",     // nested data inside a data 
//     address: {
//         city: "jaipur",
//         pin: 302012,
//         location:{
//             lat: 23.2,
//             lng: 77.3,
//         },
//     },
// };

// accessing lng who inside location and location inside address and address inside usre

// user.address.location.lng; // we don't write this line in program , we write it in the console // called deep accessing 


// OBJECT DESTRUCTURING
// const user = {
//     name:"tanu",     // nested data inside a data 
//     address: {
//         city: "jaipur",
//         pin: 302012,
//         location:{
//             lat: 23.2,
//             lng: 77.3,
//         },
//     },
//};
// let {lat, lng} = user.address.location;



//  LOOPING
//  let obj = {      // for-in
//      name: "tanu",
//      age: 45,
//      email: "test@test.com",
//  };
// for (let values in obj){   // it give all sigle single values in console
//     console.log(values);
// }
//    OR
// for (let values in obj){
//     console.log(values, ":", obj[values]);
// }


// let obj = {      // Object.keys(); = use to convert an object key into array
//      name: "tanu",
//      age: 45,
//      email: "test@test.com",
//  };
//Object.keys(obj); // write in console


// let obj = {      // Object.entries(); = use to convert an object key into array into array
//      name: "tanu",
//      age: 45,
//      email: "test@test.com",
//  };
//Object.entries(obj); // write in console


// COPYING OBJECTS
// let obj = {      
//      name: "tanu",
//      age: 45,
//      email: "test@test.com",
//  };
//let obj2 = {...obj}; //   spread 


// let obj = {      
//      name: "tanu",
//      age: 45,
//      email: "test@test.com",
//  };
// let obj2 = Object.assign({}, obj);   //    Object.assign
// //   OR
// let obj2 = Object.assign({ price: Infinity}, obj); // assign new data 


// let obj = {      
//       name: "tanu",  // if we have nested object who we copying it and also called it deep colne
//       age: 45,
//       email: "test@test.com",
//       address: {
//         city: "jaipur",
//       },
//   };

// let object = JSON.parse(JSON.stringify(obj));
// JSON.stringify = use exact object convert into string 
// JSON.parse = use to convert string into it's real form object
// obj2.address.city = "indore"  // change the data and don't effect real obj


//  OPTIONAL CHAINING
// let obj = {      
//       name: "tanu", // if we change the data in future so who we access them and it's called optional chanining
//       age: 45,
//       email: "test@test.com",
//       addresses: {
//         city: "jaipur",
//       },
//   };
//obj?.address?.city // write in console 
// output gives undifined instead of error


// COMPUTED PROPERTIES = if we have a variable and we want to be creating in inside our objest so we can use it 

// let role = "admin";  // another variable

// let obj = {      
//       name: "tanu",
//       age: 45,
//       email: "test@test.com",
//       [role]: "taniya",     // Dynamically assign properties
//   };


// QUESTIONS 

// let obj = {
//     name: "taniya",
//     age: 20,
//     isEnrolled: true,
// };


// const obj = {       // a key was a boolen or a number 
//     true: "yes",
//     42: "answer",
// };
// console.log(obj[42]);

 
// const user = {
//     "first": "last",
// };
// user.first  // write in console


// let key = "age";

// const user ={
//     age: 20,
// };
// user[key]

//  const locations =
//  {
//    city: "jaipur",
//     coordinates: 
//      {
//        lat: 23.2,
//        lng: 77.4,
//      },
//  };
// locations.coordinates.lat  // write in console


//  const locations ={
//     city: "jaipur",
//     coordinate: 
//     {
//         lat: 23.2,
//         lng: 77.4,
//       },
//  };
//  locations?.coordinates?.lat // write in console

// const user =
// {
//     "first-name": "tannu",
// }
// let {"first-name": firstName } = user;


// const course ={
//     title: "JS",
//     duration: "4 weeks",
// };
// for(let key in course)
// {
//     console.log(key, ":", course[key]);
// }


// const course ={
//      title: "JS",
//      duration: "4 weeks",
//  };
// Object.entries(course).forEach(function (val){
//     console.log(val[0] + ":" + val[1])
// });

// const original ={ a: 1,
//                   b: 2,
//                 };
// const copy ={...original};

// const obj1 = {
//     info: {
//         score: 80,
//     },
// };
// let obj2 = JSON.parse(JSON.stringify(obj1));
// obj2.info.score = 100;

// const person ={};
// console.log(person?.profile?.name);

// const key = "name";

// const obj ={
//     age: 20,
//     city: "jaipur",
//     [key]: "tannu", 
// };

