//                                                 DOM MENIPULATION

// const { createElement } = require("react");


//     WHO SELECT ELEMENTS FROM HTML

// document.querySelector // first method to select element
// document.getElementById // second method to select element
// document.getElementsByClassName // third method to select element

// let idname = document.getElementById("idname"); // second method to select element
// console.log(idname); // console.dir(idname);

// let classname = document.getElementsByClassName("classname");
// console.log(classname);

// QUERY SELECTOR

// let A = document.querySelector("h1");
// console.log(A); // output : <h1 class="classname"> hello programmers</h1>
// console.dir(A); 

// QUERY SELECTOR ALL

// let A = document.querySelectorAll("h1");
// console.dir(A);



//    TEXT / CONTENT  ACCESS = innerHTML ,innerTEXT, textCONTENT
 
// let h1 = document.querySelector("h1"); // first = textContent
// h1.textContent = "it's my life";

// let h1 = document.querySelector("h1"); // second = innerHTML // CHANGE HTML 
// h1.innerHTML = "it's my life";

// let h1 = document.querySelector("h1"); // third = innerText
// h1.innerText = "it's my life";



//     ATTRIBUTE MANIPULATION = getAttribute, setAttribute, removeAttribute

// let a = document.querySelector("a");
// console.dir(a);  // dont't give it any value than it automatically reffers the page url  

// let a = document.querySelector("a"); 
// a.href = "https://www.google.com"

// let a = document.querySelector("a");         // setAttribute
// a.setAttribute("href", "https://www.google.com");

// let img = document.querySelector("img");
// img.setAttribute("src", "https://images.unsplash.com/photo-1786058856583-e5479f5b4fa7?q=80&w=1333&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D");

// let a = document.querySelector("a");  //  getAttribute
// console.log(a.getAttribute("href"));

// let a = document.querySelector("a");  //  removeAttribute
// a.removeAttribute("href");



// DYNAMIC DOM MAINPULATION : createElament, appendChild, removeChild, prepend

// let h1 = document.createElement("h1");  //     createElament,  append, prepend, remove
// h1.textContent = "hello world";
// document.querySelector("body").prepend(h1); // the first element in a body
// document.querySelector("body").append(h1);  // the last element in a body
// let h1 = document.querySelector("h1");
// h1.remove();

// let h1 = document.createElement("h1");
// h1.textContent = "hello world";
// console.log(h1); // show in console
// document.body.append(h1); // show in html code with browser page

// let h1 = document.createElement("h1");
// h1.textContent = "me tannu";
 //document.querySelector("div").prepend(h1);   // prepend = before 
// document.querySelector("div").appendChild(h1); // apend is same to appendchild = after


//  STYLE UPDATE via .style and classList (add, remove, toggle)

// let h1 = document.querySelector("h1");  //  .style = to change color, backgroundcolor, font etc
// h1.style.color = "red";
// h1.style.backgroundColor = "skyblue";
// console.dir(h1);

// let h1 = document.querySelector("h1");
// h1.classList.add("my");    // add class
// h1.classList.remove("my"); // remove class
// h1.classList.toggle("my"); // class is exist so remove it and if class not exist then add it






//                                   QUESTIONS
// let h1 = document.querySelector("h1");
// h1.textContent = "good morning";

// let p = document.querySelector("p");
// p.style.color = "red";

// let div = document.querySelector("div");
// div.style.backgroundColor = "orange";

// let div = document.querySelector(".my");
// div.style.backgroundColor = "skyblue";

// let h1 = document.querySelector("h1");
// h1.innerHTML = "<h5> javascript programming </h5> ";

// let img = document.querySelector("img");
// img.setAttribute("src", "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjeNsK0rsBAI29daqvnmxi1bRkgFd-vdmy50qaPyI2OlpzExJL7ts98n3a&s=10");
 
// let a = document.querySelector("a");
// a.setAttribute("href", "https://www.typing.com");
 

// let input = document.querySelector("input");
// console.dir(input.value);

// let h1 = document.querySelector("h1");
// h1.style.color = "red";

// let p = document.createElement("p")
// p.textContent = "hbhbhbhbhbhbhbh"
// document.querySelector("body").prepend(p);


// let li = document.createElement("p")
// p.textContent = "hbhbhbhbhbhbhbh"
// document.querySelector("body").prepend(p);

     




//                                        EVENTS AND EVENT HANDLING / LISTENER

// let h1 = document.querySelector("h1")
// h1.addEventListener("click", function(){
//     h1.style.color = "red"
// })

// let p = document.querySelector("p");
// p.addEventListener("dblclick", function(){
//     p.style.color = "skyblue";
// })


// REMOVED THE COLOR
// let p = document.querySelector("p");

// function tanu(){
//     p.style.color = "red"
// }

// p.addEventListener("dblclick", tanu)
// p.removeEventListener("dblclick", tanu)

// let inp = document.querySelector("input");
// inp.addEventListener("input", function(dbt){
//     if(dbt.data !== null)
//     {
//     console.log(dbt.data);
//     }
// })

// let sel = document.querySelector("select");
// let dev = document.querySelector("#sel")
// sel.addEventListener("change", function(hnhyyyh){
//     dev.textContent = `${hnhyyyh.target.value} Device selected`
// })

// let h1 = document.querySelector("h1")

// window.addEventListener("keydown", function(vbb){
//     // console.log(vbb)
//     if (vbb.key === " "){
//         h1.textContent = "SPC";
//     }
//     else if(vbb.key === "r" || vbb.key === "R"){
//         h1.textContent = "DUDU";
//     }
//     else if(vbb.key === "t" || vbb.key === "T"){
//         h1.style.color = "red"
//     }
//     else if(vbb.key === "b" || vbb.key === "B"){
//         h1.style.color = "blue";
//     }
//     else{
//         h1.textContent = vbb.key
//     }
// })


// let btn = document. querySelector("#btn");
// document.querySelector("#fileinp");

// btn.addEventListener("click", function(){
// fileinp.click();
// })

// let form = document.querySelector("form");
// let input = document.querySelectorAll("input");
// let main = document.querySelector("#main");

// form.addEventListener("submit", function(vdd){
//     vdd.preventDefault();

//     let card = document.createElement("div");
//     card.classList.add("card");

//     let profile = document.createElement("profile");
//     profile.classList.add("profile");

//     // card.appendChild("profile");   // add div into another div

//     let img = document.createElement("img");
//     img.setAttribute("src", "https://t3.ftcdn.net/jpg/06/99/57/00/240_F_699570058_7KloEK0gO9JbPAdvKHBtqdRd1lRZglSf.jpg")
    
//     let h3 = document.createAttribute("h3");
//     h3.textContent = "LOTUS";

//     let h5 = document.createAttribute("h5");
//     h5.textContent = "Natural Beauty";
    
//     let P = document.createAttribute("P");
//     P.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Eos distinctio nesciunt asperiores iste quos, saepe nobis, laborum voluptas aperiam";
    
//     profile.appendChild(img);
//     card.appendChild(profile);

//     card.appendChild(h3);
//     card.appendChild(h5);
//     card.appendChild(p);

//     main.appendChild(card);
       
        // inputs.forEach(function(inp){
        //     if (inp.type !== "submit"){
        //         inp.value = " ";
        //     }
        // });
// });


// let me = document.querySelector("#me");

// me.addEventListener("mouseover", function(){
//     me.style.backgroundColor = "brown";
// });

// me.addEventListener("mouseout", function(){
//     me.style.backgroundColor = "burlywood";
// });


// let me = document.querySelector("#me");

// me.addEventListener("mouseover", function(){
//     me.style.backgroundColor = "blue";
// })


// me.addEventListener("mouseout", function(){
//     me.style.backgroundColor = "skyblue";
// })



// let me = document.querySelector("#me");

// window.addEventListener("mousemove", function(vbb){
//     me.style.top = vbb.clientX + "px";    
//     me.style.left = vbb.clientY + "px";    
// });





//EVENT OBJECT: TAREGET, TYPE, PREVENTDEFAULT
// let me = document.querySelector("#me");
// me.addEventListener("click", function(vbb){ // vbb is a event object
//     console.log(vbb);   
// })

// target is = me , type is = "click" , preventdefault use for mostly in forms because of do't refraching the page

 



// EVENT BUBBLING END CAPTUTING 

//eventbubbling
// document.querySelector("#nav").addEventListener("click", function(){
//     alert("clicked");
// })


// let ul = document.querySelector("ul");
// ul.addEventListener("click", function(vbb){
//     console.log(vbb.target);
// });


//event capturing
// let a = document.querySelector(".a");
// let b = document.querySelector(".b");
// let c = document.querySelector(".c");
// let button = document.querySelector("button");

// button.addEventListener("click", function(){
//     console.log("button clicked");
// });

// c.addEventListener("click", function(){
//     console.log("c clicked");
    
// },
// true
// );


// b.addEventListener("click", function(){
//     console.log("b clicked");
// });


// a.addEventListener("click", function(){
//     console.log("a clicked");
// },
// true
// );


// CHECKING LENGTH
// let inp = document.querySelector("input");
// inp.addEventListener("input", function(){
//     console.log(inp.value.length);
// });

//                  OR


// let inp = document.querySelector("input");
// let span = document.querySelector("span");

// inp.addEventListener("input", function(){
//     span.textContent = inp.value.length;
// });

//                  OR



// let inp = document.querySelector("input");
// let span = document.querySelector("span");

// inp.addEventListener("input", function(){
//     let left = 20 - inp.value.length;
//     if(left < 0)
//     {
//         span.textContent = left;
//         span.style.color ="red";
//     }
//     else
//     {
//         span.style.color = left;
//     }
// });







//           FORMS AND FORM VALIDATION

let nam = document.querySelector("#name");
let form = document.querySelector("form");

form.addEventListener("submit", function(vbb){
    vbb.preventDefault();

    if (nam.value.length>2)
        {
            document.querySelector("#hide").style.display = "initial";
        }  
    else
    {
            document.querySelector("#hide").style.display = "initial";
    }
} );









//           SET-TIME-OUT  AND SET-INERWEL

// setTimeout(function(){
//     console.log("hello");
// }, 5000)


// setInterval(function(){
//     console.log("hello");
// }, 5000)



//          CLEAR-TIME-OUT AND CLEARE-INTERVEL

// let tm = setTimeout(function(){
//      console.log("hello");
//  }, 5000);
//  clearTimeout(tm);


//  let tm = setInterval(function(){
//      console.log("hello");
//  }, 5000);
//  clearInterval(tm);


// let count = 10;
// let interval = setInterval(function(){
//     if(count >=1)
//     {
//         console.log(count);
//         count--;
//     }
//     else clearInterval(interval);
// }, 1000);


// let count = 0;
// let progress = document.querySelector(".progress-bar");
// let percentText = document.querySelector("#percentText");


// let interval = setInterval(function(){
//     if(count < 100){
//         count++;
//         progress.style.width = `${count}%`;
//         percentText.textContent = `${count}%`;
//     }
//     else
//     {
//         document.querySelector("h2").textContent = "Completed...";
//         clearInterval(interval);
//     }
// }, 30); 




//              LOCALSTORAGE , SESSIONSTORAGE AND COOKIES

// STORE DATA
// localStorage.setItem("name", "tannu");

// FEATCH DATA
// let naam = localStorage.getItem("name");

//REMOVE DATA 
// localStorage.removeItem("naam");

//UPDATE DATA
// localStorage.setItem("name", "rachit");

// COOKIES



