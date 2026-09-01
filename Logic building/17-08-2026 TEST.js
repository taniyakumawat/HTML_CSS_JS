//right half triangle with numbers(i)
// for (let i =1 ; i <= 5; i++){
//     right=""
//     for (let j = 1; j <=i ; j++) {
//         right+=i;
//     }
//     console.log(right);  
// }

// right half triangle with numbers(j)
// for (let i =1 ; i <= 5; i++){
//     right=""
//     for (let j = 1; j <=i ; j++) {
//         right+=j;
//     }
//     console.log(right);  
// }

// right half triangle with *
// for (let i =1 ; i <= 5; i++){
//     right=""
//     for (let j = 1; j <=i ; j++) {
//         right+="*";
//     }
//     console.log(right);  
// }

// left half triangle with *
// for (let i=1 ; i<=5; i++){
//     left=""
//     for (let k=1; k<=5-i ; k++) {
//         left+=" ";
//     }
//     for (let j=1;  j<=i; j++) {
//         left+="*";
//     }
//     console.log(left);
// }

// for (let i=1; i<=5; i++) {
//     str=""
//     for (let j=1; j<=5; j++) {
//         str+=j;
        
//     }
//     console.log(str);
    
// }

// for (let i=1; i<=5; i++) {
//     str=""
//     for (let j=1; j<=6-i; j++) {
//         str+="*";
        
//     }
//     console.log(str);
    
// }


for (let i=1; i<=5; i++) {
    str=" "
    for (let j=1; j<=i; j++) {
        str+=" ";
    }
    for (let k=1; k<=5-i; k++) {
        str+="*";
    }
    console.log(str);
}