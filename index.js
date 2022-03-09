const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = 5000;
const bodyParser = require("body-parser");
const cors = require("cors");
const { initializeApp } = require("firebase-admin/app");
const fileUpload = require("express-fileupload");
require("dotenv").config();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("doctors"));
app.use(fileUpload());
const { getAuth } = require("firebase-admin/auth");
const admin = require("firebase-admin");

const serviceAccount = require("./secure/doctorsportaldb-firebase-adminsdk-24i0i-8ebac99b75.json");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lfa2u.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

app.get("/", (req, res) => {
	res.send("Hello World!");
});

const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1,
});
client.connect((err) => {
	const appointmentCollection = client
		.db("DoctorsPortalDB")
		.collection("Appointments");
	const doctorCollection = client.db("DoctorsPortalDB").collection("Doctors");

	// -->  Post data
	app.post("/addAppointment", (req, res) => {
		const appointment = req.body;
		appointmentCollection.insertMany([appointment]).then((result) => {
			res.send(result.insertedCount > 0);
		});
	});

	app.post("/appointmentsByDate", (req, res) => {
		const date = req.body.date;
		appointmentCollection.find({ date: date }).toArray((err, documents) => {
			res.send(documents);
		});
	});

	// --> Get data
	app.get("/appointments", (req, res) => {
		const bearer = req.headers.authorization;
		if (bearer && bearer.startsWith("Bearer ")) {
			const idToken = bearer.split(" ")[1];
			getAuth()
				.verifyIdToken(idToken)
				.then((decodedToken) => {
					const tokenEmail = decodedToken.email;
					const queryEmail = req.query.authMail;
					if (tokenEmail === queryEmail) {
						appointmentCollection
							.find({ authMail: queryEmail })
							.toArray((err, documents) => {
								res.send(documents);
							});
					} else {
						res.status(401).send("Unauthorized Access");
					}
				})
				.catch((err) => {
					res.status(401).send("Unauthorized Access");
				});
		} else {
			res.status(401).send("Unauthorized Access");
		}
	});

	app.post("/addDoctor", (req, res) => {
		const file = req.files.file;
		const name = req.body.name;
		const email = req.body.email;
		const newImg = file.data;
		const encodedImg = newImg.toString("base64");
		const image = {
			contentType: file.mimetype,
			size: file.size,
			img: Buffer.from(encodedImg, "base64"),
		};
		doctorCollection.insertMany[{ name, email, image }].then((result) => {
			res.send(result.insertedCount > 0);
		});
	});
});

app.listen(process.env.PORT || port);
