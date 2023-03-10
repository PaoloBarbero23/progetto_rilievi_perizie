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
const DURATA_TOKEN = 10000000 // sec
const auth: any = JSON.parse(process.env.gmail as string)
const message = fs.readFileSync("message.html", "utf8");


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
            let tipo = req.body.tipo
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

                        if (tipo == "utente") {//si ?? fatto l'accesso dall'applicazione
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
                                    else {
                                        //controllo se l'utente vuole mantenere l'accesso
                                        if (dbUser.deleted) {
                                            res.status(401)
                                            res.send("User not found")
                                        } else {
                                            //creo il token
                                            let token = createToken(dbUser);
                                            res.setHeader("Access-Control-Allow-Origin", "*")
                                            res.setHeader("Authorization", token);
                                            // Per permettere le richieste extra domain
                                            res.setHeader(
                                                "access-control-expose-headers",
                                                "Authorization"
                                            );
                                            res.send({ ris: "ok" });
                                        }


                                    }
                                }
                            })
                        }
                        else {//si ?? fatto l'accesso dal sito
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
                                        else {
                                            let token = createToken(dbUser);
                                            res.setHeader("Authorization", token);
                                            // Per permettere le richieste extra domain
                                            res.setHeader(
                                                "access-control-expose-headers",
                                                "Authorization"
                                            );
                                            res.send(JSON.stringify(dbUser))
                                        }

                                    }
                                })
                            }
                        }

                    }
                })
                .catch((err: Error) => {
                    res.status(500);
                    res.send("Query error: " + err.message)
                    console.log(err.stack);
                })

        }).catch(() => {
            res.status(503)
            res.send("Database server unavailable")
        })
})

function createToken(user: any) {
    let time: any = new Date().getTime() / 1000;
    let now = parseInt(time); //Data attuale espressa in secondi
    let payload = {
        iat: user.iat || now,
        exp: now + DURATA_TOKEN,
        _id: user._id,
        username: user.username,
    };
    let token = jwt.sign(payload, privateKey);
    console.log("Creato nuovo token " + token);
    return token;
}

// 8. gestione Logout


// 9. Controllo del Token
app.use("/api", function (req: any, res, next) {
    if (!req.headers["authorization"]) {
        res.status(403);
        res.send("Token mancante");
    }
    else {

        let token: any = req.headers.authorization;
        jwt.verify(token, privateKey, (err: any, payload: any) => {
            if (err) {
                res.status(403);
                res.send("Token scaduto o corrotto");
            } else {
                let newToken = createToken(payload);
                res.setHeader("authorization", token);
                // Per permettere le richieste extra domain
                res.setHeader("access-control-expose-headers", "authorization");
                req["payload"] = payload;
                next();
            }

        });
    }


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
let transporter = nodemailer.createTransport({
    "service": "gmail",
    "auth": auth
});

app.get("/api/getKey", (req: any, res: Response, next: NextFunction) => {
    res.send(JSON.stringify({"key" : process.env.MAP_KEY}));
})
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
    if(req.body.change == "true"){
        req.body.change = true;
    }
    else{
        req.body.change = false;
    }
    req.body.admin = false;
    let collection = req["connessione"].db(DBNAME).collection("Users")
    if (!req.files || Object.keys(req.files).length == 0) {//non ci sono immagini
        collection.findOne({ mail: req.body.mail }).then((data: any) => {
            if (data) {
                res.status(401);//401 = Unauthorized
                res.send("Mail gi?? registrata");
            }
            else {
                bcrypt.hash(req.body.password, 10, (err: Error, hash: string) => {
                    if (err) {
                        res.status(500);
                        res.send(err.message);
                    }
                    else {
                        let pwd = req.body.password;
                        req.body.password = hash;
                        collection.insertOne(req.body).then((data: any) => {
                            let msg = message.replace('__user', req.body.mail).replace("__password", pwd).replace("__content", "Benvenuto in Rilievi e Perizie, il tuo account ?? stato creato con successo.");

                            let mailOptions = {
                                "from": auth.user,
                                "to": req.body.mail,
                                "subject": "Password rigenerata",
                                // "text": msg,
                                "html": msg,
                            }
                            transporter.sendMail(mailOptions, function (err, info) {
                                if (err) {
                                    res.status(500).send("Errore invio mail\n" + err.message);
                                }
                                else {
                                    console.log("Email inviata correttamente");
                                    res.send(data);
                                }
                            })

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

                    let record: object = { "username": req.body.username, "img": result.secure_url, "mail": req.body.mail, "password": hash, "admin": false, "color": "#FF0000", "change" : req.body.change, "deleted": false};
                    collection.insertOne(record).then((data: any) => {
                        let msg = message.replace('__user', req.body.mail).replace("__password", req.body.password).replace("__content", "Benvenuto in Rilievi e Perizie, il tuo account ?? stato creato con successo.");

                        let mailOptions = {
                            "from": auth.user,
                            "to": req.body.mail,
                            "subject": "Password rigenerata",
                            // "text": msg,
                            "html": msg,
                        }
                        transporter.sendMail(mailOptions, function (err, info) {
                            if (err) {
                                res.status(500).send("Errore invio mail\n" + err.message);
                            }
                            else {
                                console.log("Email inviata correttamente");
                                res.send(data);
                            }
                        })
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
    if (value == 1)
        project = { "perizie.$": 1, "mail": 1, "username": 1, "img": 1, "color": 1, "_id": 0 }
    else
        project = { "perizie": 1, "mail": 1, "username": 1, "img": 1, "color": 1, "_id": 0 }
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
    collection.updateOne(query, { $set: { "perizie.$.nome": nome, "perizie.$.data": data, "perizie.$.descrizione": descrizione, "perizie.$.img_desc": img_desc } }).then((data: any) => {
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
    collection.find(query).project({ "mail": 1, "username": 1, "perizie.$": 1, "_id": 0 }).toArray().then((data: any) => {
        res.send(JSON.stringify(data));
    }).catch((err: Error) => {
        res.status(500);
        res.send(err.message);
    });
});


app.post("/api/riGeneraPassword", (req: any, res: Response, next: NextFunction) => {
    let mail = req.body.mail;
    let password = creaPassword();
    let collection = req["connessione"].db(DBNAME).collection("Users")
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            res.status(500);
            res.send(err.message);
        }
        else {
            collection.updateOne({ mail: mail }, { $set: { password: hash, "change" : true } }).then((data: any) => {
                //manda mail
                let msg = message.replace('__user', mail).replace("__password", password).replace("__content", "La tua password ?? stata rigenerata.")

                let mailOptions = {
                    "from": auth.user,
                    "to": mail,
                    "subject": "Password rigenerata",
                    // "text": msg,
                    "html": msg,
                }
                transporter.sendMail(mailOptions, function (err, info) {
                    if (err) {
                        res.status(500).send("Errore invio mail\n" + err.message);
                    }
                    else {
                        console.log("Email inviata correttamente");
                        res.send({
                            "ris": "OK"
                        });
                    }
                })
                res.send(JSON.stringify({ result: "ok" }));
            }).catch((err: Error) => {
                res.status(500);
                res.send(err.message);
            });
        }
    })
});


function creaPassword() {
    let password = "";
    let caratteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 8; i++) {
        password += caratteri.charAt(Math.floor(Math.random() * caratteri.length));
    }
    return password;
}
/*SEZIONE PER APPLLICAZIONE CORDOVA*/
app.post("/api/getUser", (req: any, res: Response, next: NextFunction) => {

    let collection = req["connessione"].db(DBNAME).collection("Users")

    let _id = req["payload"]._id;
    let oId = new ObjectId(_id);

    collection.findOne({ _id: oId }, { projection: { "_id": 0 } }).then((data: any) => {
        //controllo se la password dell'utente ?? "password" e se ?? cos?? la cambio
        bcrypt.compare("password", data.password).then((result: boolean) => {
            if (result)
                res.send(JSON.stringify(data))
            else
                res.send(JSON.stringify(data))
        }).catch((err: Error) => {
            res.status(500);
            res.send(err.message);
        });
    })
})

app.post("/api/checkPassword", (req: any, res: Response, next: NextFunction) => {
    let collection = req["connessione"].db(DBNAME).collection("Users")
    let password = req.body.password;
    let mail = req.body.mail;
    collection.findOne({ mail: mail }, { projection: { "_id": 0 } }).then((data: any) => {
        bcrypt.compare(password, data.password).then((result: boolean) => {
            if (result)
                res.send(JSON.stringify({ result: true }))
            else
                res.send(JSON.stringify({ result: false }))
        }).catch((err: Error) => {
            res.status(500);
            res.send(err.message);
        });
    })
})

app.post("/api/getMarkerUtente", (req: any, res: Response, next: NextFunction) => {
    let mail = req.body.mail;
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.find({ "mail": mail }).project({ "perizie": 1, "_id": 0 }).toArray().then((data: any) => {
        res.send(JSON.stringify(data));
    }).catch((err: Error) => {
        res.status(500);
        res.send(err.message);
    });
})

app.post("/api/infoUser", (req: any, res: Response, next: NextFunction) => {
    let mail = req.body.mail;
    let collection = req["connessione"].db(DBNAME).collection("Users")
    collection.findOne({ "mail": mail }, { projection: { "password": 0, "_id": 0 } }).then((data: any) => {
        res.send(JSON.stringify(data));
    }).catch((err: Error) => {
        res.status(500);
        res.send(err.message);
    });
});

app.post("/api/changePwd", (req: any, res: Response, next: NextFunction) => {
    let mail = req.body.mail;
    let password = req.body.password;
    let collection = req["connessione"].db(DBNAME).collection("Users")
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            res.status(500);
            res.send(err.message);
        }
        else {
            collection.updateOne({ mail: mail }, { $set: { password: hash, change:false } }).then((data: any) => {
                res.send(JSON.stringify({ result: "ok" }));
            }).catch((err: Error) => {
                res.status(500);
                res.send(err.message);
            });
        }
    })
});
app.post("/api/uploadCloudinary", (req: any, res: Response, next: NextFunction) => {
    let mail = req.body.mail;
    let cont = 0
    let secure_urls: any = [];
    for (let i = 0; i < req.body.foto.length; i++) {
        cloudinary.v2.uploader.upload(req.body.foto[i], { folder: "progetto_rilievi_perizie" }).then((result: any) => {
            secure_urls.push({ "img_url": result.secure_url });
            cont++;
            if (cont == req.body.foto.length)//se ?? l'ultima foto
            {
                res.send(JSON.stringify({ secure_urls: secure_urls }));

            }
        }).catch((err: Error) => {
            res.status(500);
            res.send(err.message);
        });
    }

});

app.post("/api/inviaPerizia", (req: any, res: Response, next: NextFunction) => {
    let mail = req.body.mail;
    let collection = req["connessione"].db(DBNAME).collection("Users")
    let secure_urls = req.body.foto;
    collection.updateOne({ mail: mail }, { $push: { perizie: { "nome": req.body.nome, "data": req.body.data, "descrizione": req.body.descrizione, "coord": req.body.coord, "id_perizia": req.body.id_perizia, "important": false, "immagini": secure_urls, "img_desc": req.body.desc } } }).then((data: any) => {
        res.send(JSON.stringify({ result: "ok" }));
    }).catch((err: Error) => {
        res.status(500);
        res.send(err.message);
    });
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


