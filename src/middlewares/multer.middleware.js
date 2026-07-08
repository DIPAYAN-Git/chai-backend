import multer from "multer";



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp")
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    // cb(null, file.fieldname + '-' + uniqueSuffix)
    cb(null, file.originalname)
  }
})

export const upload = multer({
    storage,
})


/**
 * When users upload files (like profile pictures or video files) from the frontend, Express cannot read them out of the box because files are transmitted as binary streams. Multer intercepts these streams, chunks the data safely, and writes the files down onto your server's hard drive.
 * 
 * - Multer offers two types of storage systems: memoryStorage (storing files as binary Buffers directly inside your server's RAM) and diskStorage (writing files straight onto the hard drive).
 * 
 * 2. Defining the Destination (destination):
 * The destination function tells Multer precisely which folder directory to dump the uploaded files into.
 * The Parameters (req, file, cb):
 * - req: The standard Express request object.
 * - file: An object containing metadata about the file being uploaded (its file type, field name, etc.).
 * - cb (Callback): A function you must execute to hand control back to Multer once you determine the folder path.
 * 
 * The Callback Mechanics cb(null, "./public/temp"):
 * - The first argument is the error slot. Since everything went fine here, we pass null.
 * - The second argument is the relative path string pointing to your local folder. This means files will temporarily land in your project's root folder under public/temp.
 * 
 * 3. Naming the File (filename):
 * 4. Exporting the Middleware Instance:
 * - Finally, we initialize Multer by passing our custom storage layout object into it and export it under the variable name 'upload'.
 * - Now, this variable acts as a clean, reusable middleware wrapper that you can slide straight into your Express route files to intercept files seamlessly before they ever reach your controllers:
*/