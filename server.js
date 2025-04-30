const express = require('express');
require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());
const path = require('path');


//importing routes
const battleRoutes = require('./routers/battleRoutes');

app.use(cors({
    origin: 'http://localhost:3000',  
  }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//battle routes
app.use('/api/battle', battleRoutes);




//upload file folder made accessible 
app.use('/get-files', express.static('uploads'));




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
    /*res.status(200).json({
      message: "File uploaded successfully!",
      file: req.file.filename,
    });*/
  });
  
  //get api----------------------------------------------

  app.get("/get-files", async (req, res) => {
    try {
      PdfSchema.find({}).then((data) => {
        res.send({ status: "ok", data: data });
      });
    } catch (error) {
      res.json({ status: "error", error: error.message });
    }
  });	

  //delete api----------------------------------------------

  app.delete("/delete-file/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await PdfSchema.findByIdAndDelete(id);
      res.send({ status: "ok" ,message: "PDF deleted successfully"});
    } catch (error) {
      res.json({ status: "error", message: "An error occurred while deleting the PDF", error: error.message });
    }
  });

  //edit api----------------------------------------------
  // Update PDF endpoint
app.put("/update-file/:id", upload.single("selectedFile"), async (req, res) => {
  try {
    const id = req.params.id;
    const { title, subject, description } = req.body;
    
    // Create an update object
    const updateData = {
      title,
      subject,
      description
    };
    
    // If a new file was uploaded, add it to the update
    if (req.file) {
      updateData.key = req.file.filename;
    }
    
    // Update the document
    const updatedPdf = await PdfSchema.findByIdAndUpdate(
      id, 
      updateData,
      { new: true } // Return the updated document
    );
    
    if (!updatedPdf) {
      return res.status(404).json({ status: "error", message: "PDF not found" });
    }
    
    res.send({ 
      status: "ok", 
      message: "PDF updated successfully",
      data: updatedPdf
    });
    
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ 
      status: "error", 
      message: "An error occurred while updating the PDF", 
      error: error.message 
    });
  }
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