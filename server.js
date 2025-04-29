const express = require('express');
require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

app.use(cors({
    origin: 'http://localhost:3000',  
  }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//upload file folder made accessible 
app.use("/uploads",express.static("/uploads"))



//multer-------------------------------------------------
const multer  = require('multer')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() 
      cb(null, uniqueSuffix+file.originalname)
    }
  })
  

  require("./models/pdfModel");
  const PdfSchema=mongoose.model("PdfModel");
  const upload = multer({ storage: storage })

  app.post("/upload-files", upload.single("selectedFile"), async (req, res) => {
    console.log("📥 Received PDF file:", req.file);
    console.log("📄 Other form data:", req.body);

    const title = req.body.title;
    const subject = req.body.subject;
    const description = req.body.description;
    const filename = req.file.filename;
    try{
      await PdfSchema.create({
       title:title,
       subject:subject,
       description:description,
       key:filename
      });
      res.send({status: "ok"});
    }catch(error){
      res.json({status:"error"});
    }
    

  
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
  
    // ✅ Success response
    res.status(200).json({
      message: "File uploaded successfully!",
      file: req.file.filename,
    });
  });
  
  






  

//importing routers
const userRouter = require('./routers/userRouters');





app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
    })

//routers
app.use('/api/user', userRouter);

//connect to mongodb
mongoose.connect(process.env.MONGO_URI) 
    .then(()=>{
        //lissening for request
        app.listen(process.env.PORT, () => {
            console.log('connect to the db & listening for request on port ', process.env.PORT);
        })
    })
    .catch((err)=>{console.log(err)});

app.get('/', (req, res) => {
    res.send('hello world');
});