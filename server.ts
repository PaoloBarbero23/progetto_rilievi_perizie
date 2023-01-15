"use strict"

// import 
import http from "http";
import fs from "fs";
import express from "express";  // @types/express
import { Request, Response, NextFunction } from 'express';
import dotenv from "dotenv";
import { MongoClient, ObjectId, WithId } from "mongodb";
import cors from "cors"         // @types/cors
import fileUpload, { UploadedFile } from "express-fileupload";
import cloudinary, { UploadApiResponse } from "cloudinary";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer" // per invio mail


// config
const app = express();
const HTTP_PORT: number = 1337;
dotenv.config({ path: ".env" });
const DBNAME: string = "rilievi_perizie";
const CONNECTION_STRING: string | undefined = process.env.connectionString;
cloudinary.v2.config(JSON.parse(process.env.cloudinary as string))
const corsOptions = {
    origin: function (origin: any, callback: any) {
        return callback(null, true);
    },
    credentials: true
}
//const privateKey = fs.readFileSync("keys/privateKey.pem", "utf8");
const DURATA_TOKEN = 20 // sec



// ***************************** Avvio ****************************************
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, function () {
    init();
    console.log("Server HTTP in ascolto sulla porta " + HTTP_PORT);
});
let paginaErrore = "";
function init() {
    fs.readFile("./static/error.html", function (err, data) {
        if (!err)
            paginaErrore = data.toString();
        else
            paginaErrore = "<h1>Risorsa non trovata</h1>"
    });
}


/* *********************** (Sezione 2) Middleware ********************* */
// 1. Request log
app.use("/", function (req, res, next) {
    console.log("** " + req.method + " ** : " + req.originalUrl);
    next();
});


// 2 - risorse statiche
app.use("/", express.static('./static'));


// 3 - lettura dei parametri post
app.use("/", express.json({ "limit": "20mb" }));
app.use("/", express.urlencoded({ "extended": true, "limit": "20mb" }));


// 4 - binary upload
app.use("/", fileUpload({
    "limits": { "fileSize": (20 * 1024 * 1024) } // 20*1024*1024 // 20 M
}));


// 5 - log dei parametri 
app.use("/", function (req, res, next) {
    if (Object.keys(req.query).length > 0)
        console.log("        Parametri GET: ", req.query)
    if (Object.keys(req.body).length != 0)
        console.log("        Parametri BODY: ", req.body)
    next();
});


// 6. cors
app.use("/", cors(corsOptions));


// 7. gestione login
app.post('/api/login', function (req: Request, res: Response, next: NextFunction) {
    let connection = new MongoClient(CONNECTION_STRING as string)
    connection.connect()
        .then((client: MongoClient) => {
            const collection = client.db(DBNAME).collection("Users")
            let regex = new RegExp(`^${req.body.username}$`, "i")
            let query = { "mail": regex }
            collection.findOne(query)
                .then((dbUser) => {
                    if (!dbUser) {
                        res.status(401)
                        res.send("User not found")
                    }
                    else {
                        //controllo se l'utente trovato abbia il campo admin
                        if (!dbUser.admin) {
                            res.status(401)
                            res.send("User not found")
                        }
                        else {
                            //confronto la password
                            bcrypt.compare(req.body.password, dbUser.password, (err: Error, success: Boolean) => {
                                if (err) {
                                    res.status(500)
                                    res.send("Errore bcrypt: " + err.message)
                                }
                                else {
                                    if (!success) {
                                        res.status(401)
                                        res.send("Password not valid")
                                    }
                                    else
                                        res.send(JSON.stringify(dbUser))
                                }
                            })
                        }
                    }
                })
                .catch((err: Error) => {
                    res.status(500);
                    res.send("Query error: " + err.message)
                    console.log(err.stack);
                })
        })
        .catch(() => {
            res.status(503)
            res.send("Database server unavailable")
        })
});


// 8. gestione Logout


// 9. Controllo del Token
app.use('/api', function (req, res, next) {
    next();
});


// 10. Apertura della connessione
app.use("/api/", function (req: any, res: any, next) {
    let connection = new MongoClient(CONNECTION_STRING as string);
    connection.connect().then((client: any) => {
        req["connessione"] = client;
        next();
    })
        .catch((err: any) => {
            let msg = "Errore di connessione al db"
            res.status(503).send(msg)
        })
})



/* ********************* (Sezione 3) USER ROUTES  ************************** */

app.post("/api/showUtenti", (req: any, res : Response, next:NextFunction)=>{
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.find()
        .project({"mail" : 1, "admin" : 1, "username" : 1, "_id" : 0})
        .sort({"usernmae" : 1, "admin" : -1})
        .toArray()
    .then((data:any)=>{
        res.send(data)
    })
    .catch((err:Error)=>{
        res.status(500);
        res.send(err.message);
    })
})
app.post("/api/newUser", (req: any, res : Response, next:NextFunction)=>{
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.findOne({mail:req.body.mail}).then((data:any)=>{
        if(data){
            res.status(401);//401 = Unauthorized
            res.send("Mail già registrata");
        }
        else{
            bcrypt.hash(req.body.password, 10, (err:Error, hash:string)=>{
                if(err){
                    res.status(500);
                    res.send(err.message);
                }
                else{
                    req.body.password = hash;
                    collection.insertOne(req.body).then((data:any)=>{
                        res.send(data);
                    })
                    .catch((err:Error)=>{
                        res.status(500);
                        res.send(err.message);
                    })
                }
            })
        }
    })
    .catch((err:Error)=>{
        res.status(500);
        res.send(err.message);
    })  

})



/* ********************** (Sezione 4) DEFAULT ROUTE  ************************* */
// Default route
app.use('/', function (req: any, res: any, next) {
    res.status(404)
    if (req.originalUrl.startsWith("/api/")) {
        res.send("Risorsa non trovata");
        req["connessione"].close();
    }
    else
        res.send(paginaErrore);
});


// Gestione degli errori
app.use("/", (err: any, req: any, res: any, next: any) => {
    if (req["connessione"])
        req["connessione"].close();
    res.status(500);
    res.send("ERRR: " + err.message);
    console.log("SERVER ERROR " + err.stack);
});


