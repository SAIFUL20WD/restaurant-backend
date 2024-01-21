const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
require("dotenv").config({path: "./.env"});
const port = 5500;

// Middleware
app.use(cors());
app.use(express.json());

const verifyJWT = async (req, res, next) => {
  try{
    const authorization = req.headers.authorization;
    if(!authorization){
      res.status(401).send({status: "fail", message: "unauthorized"})
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, "MySpecialSecretKey123", (err, decoded) => {
      if(err){
        return res.status(401).send({status: "fail", message: "unauthorized"})
      }
      req.decoded = decoded
      next()
    });
  }
  catch(err){
    // console.log(err);
  }

}


// Replace the uri string with your connection string.
const uri = "mongodb+srv://saiful2076af:saiful2076af@cluster0.birytzx.mongodb.net/?retryWrites=true&w=majority"

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();

    const menuCollection = client.db("bistro-restaurant").collection("menus");
    const reviewCollection = client.db("bistro-restaurant").collection("reviews");
    const cartCollection = client.db("bistro-restaurant").collection("carts");
    const userCollection = client.db("bistro-restaurant").collection("users");

    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.data.email;
      const user = await userCollection.findOne({email: email})
      if(user?.role !== "admin"){
        return res.status(403).send({status: "fail", message: "forbidden"});
      }
      next();
    }
    
    app.get("/menu", async(req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    app.get("/reviews", async(req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })

    app.post("/carts", async(req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    app.get("/carts", verifyJWT, async(req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.data.email;
      if(email !== decodedEmail){
        return res.status(403).send({status: "fail", message: "forbidden"})
      }
      const result = await cartCollection.find({email:  email}).toArray();
      res.send(result);
    })

    app.delete("/carts/:id", async(req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await cartCollection.deleteOne({_id:  id});
      res.send(result);
    })

    app.post("/users", async(req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({email: user.email})
      if(existingUser){
        res.send({message: "user already exist"});
      }
      else{
        const result = await userCollection.insertOne(user);
        res.send(result);
      }
    })

    app.get("/users", verifyJWT, verifyAdmin, async(req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.patch("/users/admin/:id", async(req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await userCollection.updateOne({_id: id}, {$set: {role: "admin"}});
      res.send(result);
    })

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign({ data: user}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
      res.send({token});
    })

    app.get("/users/admin/:email", verifyJWT, async(req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.data.email;
      if(email !== decodedEmail){
        return res.status(401).send({status: "fail", message: "forbidden"})
      }
      const user = await userCollection.findOne({email: email});
      const result = {admin: user?.role === "admin"}
      res.send(result);
    })

    app.post("/menu", verifyJWT, verifyAdmin, async(req, res) => {
      const newItem = req.body;
      const result = await menuCollection.insertOne(newItem);
      res.send(result);
    })

    app.delete("/menu/:id", verifyJWT, verifyAdmin, async(req, res) => {
      // If want to delete old imported data omit new ObjectId
      const id = new ObjectId(req.params.id)
      const result = await menuCollection.deleteOne({_id: id});
      res.send(result);
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Hello Word");
})

app.listen(port, () => {
    console.log("Bistro Server Running");
});