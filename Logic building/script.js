// console.log("hello world");

// function rach ()
// {
//     console.log("hello world");
// }

// rach();

//  for(let i=0; i<=5; i++)
//  {
//      console.log("hello world");
//  }

// let array= ["H" ,"E", "L", "L", "O"];
//  console.log(array[2]);

//   let i,j,str
//   for(i=1; i<=5; i++){
//       str="";
//       for(j=1; j<=i; j++){
//           str+=i;
//       }
//       console.log(str);
//   }


//   for(let i=1; i<=5; i++){
//       str="";
//       for(let j=1; j<=i; j++){
//           str+=" * ";
//       }
//       console.log(str);

//   }

//  for(let i = 1; i <=5; i++) {
//     str=""
//     for(let j=1; j<=i; j++)
//      {
//          str+=i;
//      } 
//      console.log(str);
//  }

// let i,j;
// let row=5;
// for (let i = 1; i<=row; i++) {
//    str=""
//    for(let j=1; j<=i; j++)
//     {
//         str+="*";
//     } 
//     console.log(str);
// }

  str=""
 for(let i=1; i<=5; i++)
     {
     for(let j=1; j<=5-i; j++){
         str+=" "
     }
    
         for(let k=1; k<=((2*i)-1); k++){
         str+="*";
         }
     str+="\n";
     console.log(str);
 }
   