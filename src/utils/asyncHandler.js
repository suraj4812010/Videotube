const asyncHandler = (requesthandler) => {
       return (req,res,next) => {
        Promise.resolve(requesthandler(req,res,next))
        .catch((err) => next(err))
    
       }
}

export {asyncHandler}



// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}

// ANOTHER METHOD
// use to wrap up the function 
// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.send(500).json({
//             success : false,
//             message : error.message
//         })
//     }
// }