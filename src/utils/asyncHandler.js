// const asyncHandler = (requestHandlerFxn) => {
//     return (req,res,next) => {
//         Promise.resolve(requestHandlerFxn(req,res,next)).catch((error) => next(error));
//     }
// }

// OR (using an implicit return by removing the outer curly braces):

const asyncHandler = (requestHandlerFxn) => (req,res,next) => {
    Promise.resolve(requestHandlerFxn(req,res,next)).catch((error) => next(error));
}
export { asyncHandler };

// const asyncHandler = (requestHandlerFxn) => async (error,req,res,next) => {
//     try {
//         await requestHandlerFxn(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }