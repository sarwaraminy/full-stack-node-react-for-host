import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from './dbConnect.js';
import dotenv from 'dotenv';

//-----------------------------------------------------------------
// propare for hosting
//-----------------------------------------------------------------
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Enable CORS for all routes
//app.use(cors({
//  origin: 'http://localhost:3000', // Allow requests from this origin
//}));


app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.static(path.join(__dirname, '../build'))); // it is for production where the build is from frontend with "npm run build"

app.get(/^(?!\/room).+/, (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
});

app.get('/rooms', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM room');
        res.json(result.rows);
    } catch (err) {
        //console.error(err);
        res.status(500).send('Server Error');
    }
});

// Endpoint to handle login requests
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        // Check if the user exists in the database
        const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userQuery.rows[0];

        // If user does not exist
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare the provided password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        // If passwords don't match
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // If email and password are correct, generate a JWT token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Send the token in the response
        res.json({ token });
    } catch (error) {
        //console.error('Error during login:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

//---------------------------------------------------------------------------------------------
// Endpoint to handle signup requests
//---------------------------------------------------------------------------------------------
app.post('/signup', async (req, res) => {
    const { email, passwordHash, firstName, lastName } = req.body;

    if (!email || !passwordHash || !firstName || !lastName) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if the user already exists
        const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userQuery.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(passwordHash, 10);

        // Insert the new user into the database
        const newUserQuery = `
            INSERT INTO users (email, password_hash, first_name, last_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, first_name, last_name
        `;
        const newUser = await pool.query(newUserQuery, [email, hashedPassword, firstName, lastName]);

        // Generate a JWT token
        const token = jwt.sign({ userId: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ token, user: newUser.rows[0] });
    } catch (error) {
        //console.error('Error during signup:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

//---------------------------------------------------------------------------------------------------------------
// Add records from UI
//--------------------------------------------------------------------------------------------------------------

//---------------------------------------------------------------------------------------------
// Endpoint to handle room/add requests
//---------------------------------------------------------------------------------------------
app.post('/room/add', async (req, res) => {
    const { name, roomNumber, bedInfo } = req.body;

    if (!name || !roomNumber || !bedInfo) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if the room already exists
        const roomQuery = await pool.query('SELECT * FROM room WHERE room_number = $1', [roomNumber]);
        if (roomQuery.rows.length > 0) {
            return res.status(400).json({ message: 'Room already exists' });
        }

        // Insert the new room into the database
        const newRoomQuery = `
            INSERT INTO room (name, room_number, bed_info)
            VALUES ($1, $2, $3)
            RETURNING room_id, name, room_number, bed_info
        `;
        const newRoomResult  = await pool.query(newRoomQuery, [name, roomNumber, bedInfo]);

        // Send a response with the newly created room details
        const newRoom = newRoomResult.rows[0];
        
        return res.status(201).json({
            message: 'Room successfully Added',
            room: newRoom
        });
    } catch (error) {
        //console.error('Error during insert:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

//---------------------------------------------------------------------------------------------
// Endpoint to handle room/edit/:roomNumber requests
//---------------------------------------------------------------------------------------------
app.put('/room/edit/:roomNumber', async (req, res) => {
    const { name, bedInfo } = req.body;
    const { roomNumber } = req.params;

    if (!name || !bedInfo) {
        console.log('Validation Error:', { name, bedInfo, roomNumber });
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const roomQuery = await pool.query('SELECT * FROM room WHERE room_number = $1', [roomNumber]);
        if (roomQuery.rows.length === 0) {
            console.log('Room not found:', roomNumber);
            return res.status(404).json({ message: 'Room not found' });
        }

        const updateRoomQuery = `
            UPDATE room
            SET name = $1, bed_info = $2
            WHERE room_number = $3
            RETURNING room_id, name, room_number, bed_info
        `;
        const updateRoomResult = await pool.query(updateRoomQuery, [name, bedInfo, roomNumber]);

        const updatedRoom = updateRoomResult.rows[0];
        console.log('Room updated successfully:', updatedRoom);

        return res.status(200).json({
            message: 'Room successfully updated',
            room: updatedRoom
        });
    } catch (error) {
        //console.error('Error during update:', error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

//---------------------------------------------------------------------------------------------
// Endpoint to handle room/delete/:roomNumber requests
//---------------------------------------------------------------------------------------------
app.delete('/room/delete/:roomNumber', async (req, res) => {
    const { roomNumber } = req.params;

    try {
        // Check if the room exists
        const roomQuery = await pool.query('SELECT * FROM room WHERE room_number = $1', [roomNumber]);
        if (roomQuery.rows.length === 0) {
            //console.log('Room not found:', roomNumber);
            return res.status(404).json({ message: 'Room not found' });
        }

        // Delete the room
        const deleteRoomQuery = `
            DELETE FROM room
            WHERE room_number = $1
            RETURNING room_id, name, room_number, bed_info
        `;
        const deleteRoomResult = await pool.query(deleteRoomQuery, [roomNumber]);

        // Check if the room was deleted
        if (deleteRoomResult.rows.length === 0) {
            //console.log('Room deletion failed:', roomNumber);
            return res.status(500).json({ message: 'Room deletion failed' });
        }

        const deletedRoom = deleteRoomResult.rows[0];
        //console.log('Room deleted successfully:', deletedRoom);

        return res.status(200).json({
            message: 'Room successfully deleted',
            room: deletedRoom
        });
    } catch (error) {
        //console.error('Error during delete:', error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
