class ApiError extends Error {
    constructor (
        statusCode,
        message = "something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;
        
        if(stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError};


/**
 * Let's break down this code literally line-by-line to understand exactly what each piece does.
 * 1. Class Inheritance (class ApiError extends Error)
 * - class ApiError: Defines a new blueprint named ApiError.
 * - extends Error: This is the core concept of inheritance. JavaScript has a built-in global class called 'Error'. By extending it, ApiError inherits capabilities of parent Error, such as tracking the file and line number where the crash occurred.
 * 
 * 2. The Parameter Defaults (constructor(...))
 * The constructor initializes a new instance of your error whenever you give into new ApiError(...). Notice the assignment signs (=); these are Default Parameters. If you don't provide these values when creating the error instance, JavaScript falls back to these defaults automatically:
 * - statusCode: The HTTP status code (e.g., 404, 401, 500).
 * - message: Defaults to "Something went wrong" if you don't write a custom message.
 * - errors: An optional array to hold detailed structural validation messages (e.g., if multiple fields in a form are filled out incorrectly).
 * - stack: Represents the "Stack Trace"—the text showing the file path and line number of the error.
 * 
 * 3. Passing to the Parent (super(message))
 * - calls the constructor of the parent class (Error). The native Error class expects a message string as its first argument to set things up under the hood. You must put this line first before touching the 'this' keyword.
 * 
 * 4. Custom API Attributes
 * - this.statusCode: Attaches the HTTP code directly to the error object so Express knows what status to send back to the user.
 * - this.data = null: In a successful API response, you send back data. In an error response, we explicitly set data to null to maintain structural consistency.
 * - this.message: Overwrites or re-assigns the error description text.
 * - this.success = false: Highly useful for your frontend team. The frontend can look at response.data.success, see it is false, and immediately know to trigger a red alert popup.
 * - this.errors: Stores the structural errors array passed during the constructor initialization.
 * 
 * 5. The if-else block:
 * - if (stack): If a custom 'stack trace' was manually passed into the constructor, we use it directly.
 * - "Error.captureStackTrace(this, this.constructor)": This is a powerful, native Node.js V8 engine method. It creates a .stack property on your new object. When an error happens, the 'stack trace' shows you exactly which functions were called, what files they were in, and the exact line number where it failed.
 * - By passing this.constructor as the second argument, it tells the engine: "Keep the logs clean. Hide the internal instantiation lines of ApiError itself from the final printout, and only show me where the actual developer code crashed."
 */