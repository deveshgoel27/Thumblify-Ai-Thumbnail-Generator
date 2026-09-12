import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/emailService";
 
//   Controllers for user registeration 
export const registerUser = async (req: Request, res: Response) => {
    try {
        const {name, email, password} = req.body;

        // find user by email
        const user = await User.findOne({email});
        if(user){
            return res.status(400).json({message: "User already exists"})
        }  

        // encrypt the password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new User({name, email, password: hashedPassword})
        await newUser.save()

        // setting user data in session
        req.session.isLoggedIn = true;
        req.session.userId = newUser._id;

        return res.json({
            message: 'Account created successfully',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        })
    } catch (error: any) {
         console.log(error);
         res.status(500).json({message: error.message}) 
    }
}

//   Controllers for user login
export const loginUser = async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body;

        // find user by email
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({message: "User not found"})
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if(!isPasswordCorrect){
            return res.status(400).json({message: "Invalid password"})
        }

        // setting user data in session
        req.session.isLoggedIn = true;
        req.session.userId = user._id;

        return res.json({
            message: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        })
    } catch (error: any) {
         console.log(error);
         res.status(500).json({message: error.message}) 
    }
}

//   Controllers for user logout
export const logoutUser = async (req: Request, res: Response) => {
     req.session.destroy((error: any) => {
        if(error){
            console.log(error);
            return res.status(500).json({message: error.message})
        }
        return res.json({message: 'Logout successful'})
     })
}

// Controller for user verify
export const verifyUser = async (req: Request, res: Response) => {
    try {
        const {userId} = req.session;

        const user = await User.findById(userId).select('-password')

        if(!user){
            return res.status(400).json({message: 'Invalid user'});
        }
        return res.json({user});
        
    } catch (error: any) {
        console.log(error);
        res.status(500).json({message: error.message})  
    }
}

// Controller: Send password reset email
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal whether email exists
            return res.json({ message: 'If that email is registered, a reset link has been sent.' });
        }

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        user.resetPasswordToken = token;
        user.resetPasswordExpires = expires;
        await user.save();

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password?token=${token}`;

        await sendPasswordResetEmail(user.email, resetUrl);

        return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (error: any) {
        console.error('[forgotPassword]', error);
        res.status(500).json({ message: 'Failed to send reset email. Try again.' });
    }
};

// Controller: Reset password using token
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: 'Token and new password are required.' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }, // token must not be expired
        });

        if (!user) {
            return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.json({ message: 'Password reset successful. You can now log in.' });
    } catch (error: any) {
        console.error('[resetPassword]', error);
        res.status(500).json({ message: 'Password reset failed. Try again.' });
    }
};
