"use strict"

// import 
import https from "https";
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
const HTTP_PORT: number = parseInt(process.env.PORT as string) || 1337;
const HTTPS_PORT: number = 1338;
dotenv.config({ path: ".env" });
const DBNAME: string = "rilievi_perizie";
const CONNECTION_STRING: string | undefined = process.env.connectionString;
//chiavi per HTTPS
const privateKey = fs.readFileSync("keys/privateKey.pem", "utf8");
const certificate = fs.readFileSync("keys/certificate.crt", "utf8");
const credentials = { "key": privateKey, "cert": certificate };
cloudinary.v2.config(JSON.parse(process.env.cloudinary as string))
const corsOptions = {
    origin: function (origin: any, callback: any) {
        return callback(null, true);
    },
    credentials: true
};
const DURATA_TOKEN = 20 // sec



// ***************************** Avvio ****************************************
let httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, () => {
    init();
});

let httpsServer = https.createServer(credentials, app);
httpsServer.listen(HTTPS_PORT, function () {
    console.log("Server in ascolto sulle porte HTTP:" + HTTP_PORT + ", HTTPS:" + HTTPS_PORT);
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

app.post("/api/showUtenti", (req: any, res: Response, next: NextFunction) => {
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.find()
        .project({ "mail": 1, "admin": 1, "username": 1, "color": 1, "deleted": 1, "img": 1, "perizie": 1, "_id": 0 })
        //si ordina mettendo in basso solo chi ha deleted = true
        .sort({ "admin": -1, "deleted": 1 })
        .toArray()
        .then((data: any) => {
            res.send(data)
        })
        .catch((err: Error) => {
            res.status(500);
            res.send(err.message);
        })
})
app.post("/api/newUser", (req: any, res: Response, next: NextFunction) => {

    let collection = req["connessione"].db(DBNAME).collection("Users")
    if (!req.files || Object.keys(req.files).length == 0) {//non ci sono immagini
        collection.findOne({ mail: req.body.mail }).then((data: any) => {
            if (data) {
                res.status(401);//401 = Unauthorized
                res.send("Mail già registrata");
            }
            else {
                bcrypt.hash(req.body.password, 10, (err: Error, hash: string) => {
                    if (err) {
                        res.status(500);
                        res.send(err.message);
                    }
                    else {
                        req.body.password = hash;
                        collection.insertOne(req.body).then((data: any) => {
                            res.send(data);
                        })
                            .catch((err: Error) => {
                                res.status(500);
                                res.send(err.message);
                            })
                    }
                })
            }
        })
            .catch((err: Error) => {
                res.status(500);
                res.send(err.message);
            })
    }
    else {
        let file = req.files.img;
        let filename = file.name;
        let path = "./static/img/" + filename;
        cloudinary.v2.uploader.upload(path, { "folder": "progetto_rilievi_perizie", "use_filename": true }).then((result: cloudinary.UploadApiResponse) => {
            bcrypt.hash(req.body.password, 10, (err: Error, hash: string) => {
                if (err) {
                    res.status(500);
                    res.send(err.message);
                }
                else {
                    req.body.password = hash;
                    let record: object = { "username": req.body.username, "img": result.secure_url, "mail": req.body.mail, "password": req.body.password, "admin": false, "color": "#FF0000" }
                    collection.insertOne(record).then((data: any) => {
                        res.send(data);
                    }).catch((err: Error) => {
                        res.status(500);
                        res.send(err.message);
                    })
                }
            })


        });
    }
})

app.post("/api/updateUser", (req: any, res: Response, next: NextFunction) => {
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.updateOne({ mail: req.body.mail }, { $set: { "color": req.body.color } }).then((data: any) => {
        res.send(JSON.stringify({ result: "ok" }));
    }).catch((err: Error) => {
        res.status(500);
        res.send(err.message);
    })
});

app.post("/api/deleteUser", (req: any, res: Response, next: NextFunction) => {
    let collection = req["connessione"].db(DBNAME).collection("Users");
    if (req.body.delete == 1) {//cancello l'utente
        collection.deleteOne({ mail: req.body.mail }).then((data: any) => {
            res.send(JSON.stringify({ result: "1" }));
        }).catch((err: Error) => {
            res.status(500);
            res.send(err.message);
        });
    }
    else { //inserisco un campo di nome deleted a true e metto il marker a rosso
        collection.updateOne({ mail: req.body.mail }, { $set: { deleted: true, "color": "#FF0000" } }).then((data: any) => {
            res.send(JSON.stringify({ result: "0" }));
        }).catch((err: Error) => {
            res.status(500);
            res.send(err.message);
        });
    }

})

app.post("/api/important", (req: any, res: Response, next: NextFunction) => {
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.updateOne({ $and: [{ mail: req.body.mail }, { "perizie": { $elemMatch: { "id_perizia": req.body.id_perizia } } }] }, { $set: { "perizie.$.important": req.body.value } }).then((data: any) => {
        res.send(JSON.stringify({ result: "ok" }));
    }).catch((err: Error) => {
        res.status(500);
        res.send(err.message);
    })
})

app.post("/api/filter", (req: any, res: Response, next: NextFunction) => {
    let mail = req.body.mail;
    let value = req.body.value;
    let query = {};
    let project;
    if (value == 1 && mail != "") {
        query = { $and: [{ mail: mail }, { "perizie": { $elemMatch: { "important": true } } }] }
    }
    else if (mail == "" && value == 1) {
        query = { "perizie": { $elemMatch: { "important": true } } }
    }
    else if (mail != "" && value == 0) {
        query = { mail: mail }
    }
    if(value == 1)
        project = { "perizie.$": 1, "mail": 1, "username": 1, "img": 1, "color": 1, "_id" : 0 }
    else
        project = { "perizie": 1, "mail": 1, "username": 1, "img": 1, "color": 1, "_id" : 0 }
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.find(query).project(project).toArray().then((data: any) => {
        res.send(JSON.stringify(data));
    }).catch((err: Error) => {
        res.status(500);
        res.send(err.message);
    })
})

app.patch("/api/modificaPerizia", (req: any, res: Response, next: NextFunction) => {
    let mail = req.body.mail;
    let id_perizia = req.body.id_perizia;
    let nome = req.body.nome;
    let data = req.body.data;
    let descrizione = req.body.descrizione;
    let img_desc = req.body.img_desc;
    if (!Array.isArray(img_desc))
        img_desc = [img_desc];

    let query = { $and: [{ mail: mail }, { "perizie": { $elemMatch: { "id_perizia": id_perizia } } }] };
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.updateOne(query, {$set : {"perizie.$.nome": nome, "perizie.$.data": data, "perizie.$.descrizione": descrizione, "perizie.$.img_desc": img_desc}}).then((data: any) => {
        res.send(JSON.stringify({ result: "ok" }));
    }).catch((err: Error) => {
        res.status(500);
        res.send(err.message);
    });


})

app.post("/api/getPerizia", (req: any, res: Response, next: NextFunction) => {
    let mail = req.body.mail;
    let id_perizia = req.body.id_perizia;
    let query = { $and: [{ mail: mail }, { "perizie": { $elemMatch: { "id_perizia": id_perizia } } }] };
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.find(query).project({"mail": 1, "username" : 1, "perizie.$" : 1, "_id" : 0 }).toArray().then((data: any) => {
        res.send(JSON.stringify(data));
    }).catch((err: Error) => {
        res.status(500);
        res.send(err.message);
    });
});



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


