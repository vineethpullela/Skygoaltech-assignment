const  express = require("express");
const app =express()
const sqlite3=require("sqlite3").verbose();
const {open}=require("sqlite")
const path=require("path")
const bcrypt =require("bcrypt");
const jwt =require("jsonwebtoken");


let port = 4000;

app.use(express.json());
const dbPath=path.join(__dirname,"data.db");

let db=null;
const initializeDBAndServer=async()=>{
    try{
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(port,()=>{
            console.log(`Server Running at https://localhost:${port}/`);
        });
    }catch(e){
        console.log(`DB error: ${e.message}`);
        process.exit(1);
    }
}

///authentication middle ware function

const authenticateToken=(request,response,next)=>{
    let jwtToken
    const authHeader=request.headers["authorization"];
    if(authHeader !== undefined){
        jwtToken=authHeader.split(" ")[1]

    }
    if(jwtToken===undefined){
        response.status(400);
        response.send("Invalid Access Token")
    }else{
        jwt.verify(jwtToken,"asdf",async(error,payload)=>{
            if(error){
                response.status(401);
                response.send("Invalid Access Token");
            }else{
                request.username=payload.username;
                next();
            }
        })
    }
}


// Register Users api

app.post("/register/",async(request,response)=>{
    const {username,name,password,gender,location}=request.body;
    const hashedPassword= await bcrypt.hash(password,10);
    const selectUserQuery=`
    SELECT  * from user WHERE username='${username}'`;
    const dbUser=await db.get(selectUserQuery);
    if(dbUser===undefined){
        const createUserQuery=`INSERT INTO user 
        (username,name,password,gender,location)
        VALUES
        ('${username}',
        '${name}',
        '${hashedPassword}',
        '${gender}',
        '${location}');`;

        await db.run(createUserQuery);
        response.send("User created Successfully");

    }else{
        response.status(400)
        response.send("User Already Exisited");
        

    }
})





///User  Login api

app.post("/login/",async(request,response)=>{
    const {username,password}=request.body;
    const selectUserQuery=`
    SELECT  * from user WHERE username='${username}';`;
    const dbUser=await db.get(selectUserQuery);
    if(dbUser===undefined){
        response.status(400);
        response.send("Invalid User, User not Found")
    }else{
        const isPasswordMatched=await bcrypt.compare(password,dbUser.password);
        if (isPasswordMatched===true){
            const payload={"username":username};
            const jwtToken=jwt.sign(payload,"asdf");
response.status(200)
            response.send({jwtToken});
        }else{
            response.status(400);
            response.send("Invalid Password");
        }
    }

})

/// get all users
app.get("/users/",authenticateToken,async(request,response)=>{
    
    const userQuery=`select * from user;`;
                const users=await db.all(userQuery);
                response.send(users)
})


/// get profile api

app.get("/profile/",authenticateToken,async(request,response)=>{
    let {username}=request;
    console.log(username);
    const selectUserQuery=`SELECT * FROM user WHERE username = '${username}'`;
    const  dbUser=await db.get(selectUserQuery);
    response.send(dbUser);
})



initializeDBAndServer()