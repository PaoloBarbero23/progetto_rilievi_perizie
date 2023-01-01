// import
import bcrypt from "bcryptjs" // + @types
import {MongoClient, ObjectId}  from "mongodb";
import dotenv from "dotenv";

// config
dotenv.config({ path: ".env" });
const DBNAME = "rilievi_perizie";
const CONNECTION_STRING:any = process.env.connectionString;


let connection = new MongoClient(CONNECTION_STRING as string);
connection.connect().then((client: any) => {
	const COLLECTION = client.db(DBNAME).collection('Users');
	COLLECTION.find().project({"password":1}).toArray(function(err:Error, vet: Array<{"_id" : ObjectId, "password" : String}>) {
		if(err){
			console.log("Errore esecuzione query" + err.message)
			client.close();
		}
		else
		{
			for(let item of vet){
				let oid = new ObjectId(item["_id"]);  
				// le stringhe bcrypt inizano con $2[ayb]$ e sono lunghe 60
				let regex = new RegExp("^\\$2[ayb]\\$.{56}$");
				// se la password corrente non è in formato bcrypt
				if (!regex.test(item["password"] as string))      
				{
					console.log("aggiornamento in corso ... ", item);
					let newPass = bcrypt.hashSync(item["password"] as string, 10)					
					COLLECTION.updateOne({"_id":oid}, {"$set":{"password":newPass}}, function(err: Error, data: any){
						if(err)
							console.log("errore aggiornamento record", item["_id"], err.message)
						
						aggiornaCnt(vet.length, client)
					})
				}
				else 
					aggiornaCnt(vet.length, client)
			}
			// client.close();  NOK !!
		}
	})
})
.catch((err: any) => {
    console.log("Errore di connessione al database");
}) 


let cnt=0;
function aggiornaCnt(length: number, client : any){
	cnt++;
	if(cnt==length){
		console.log("Aggiornamento completato correttamente")
		client.close();
	}	
}