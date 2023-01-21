"use strict"

import http from 'http'
import url from 'url'
import fs, { rmSync } from 'fs'
import { MongoClient, ObjectId } from "mongodb"
import express, { Request } from "express"
import dotenv from "dotenv";
import fileupload, { UploadedFile } from "express-fileupload";
import fileUpload from 'express-fileupload'
import cloudinary, { UploadApiResponse } from "cloudinary"
import cors from "cors"


/* ********************** */
//config
dotenv.config({ "path": ".env" })
cloudinary.v2.config(JSON.parse(process.env.cloudinary as string))
const PORT: number = 1337;
const app = express();
const DB_NAME: string = "5b";
const connectionString: any = process.env.connectionString;


let paginaErrore: string;//strinag che contiene la pagina di errore
//avvio del server

let server = http.createServer(app);





let connessione = new MongoClient(connectionString)
connessione.connect()
    .catch((err: any) => {
        console.log("Errore di connessione al database");
    })
    .then((client: any) => {
        let path = "./static/img/foto1.jpg"
        cloudinary.v2.uploader.upload(path, { "folder": "myimages", "use_filename": true })
            .then((result: cloudinary.UploadApiResponse) => {
                let record: object = { "username": "Mario Rossi", "img": result.secure_url }
                let collection = connessione.db(DB_NAME).collection("images")
                collection.updateOne(record,{$set : {"perizie" : "1"}}, (err: any, data: any) => {
                    if (err) {
                        console.log ("Errore inserimento record", err.message)
                    }
                    else
                        console.log(JSON.stringify(data))
                })

            })
            .catch((err: Error) => {
                console.log("Errore caricamento immagine", err.message)
            })//salva imm<agine su disco


    })









//salvo file in cartella










