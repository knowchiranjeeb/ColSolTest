const nodemailer = require('nodemailer');
const axios = require('axios');
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Function to generate an OTP of the specified number of digits
function generateOTP(digits) {
  const otpDigits = '0123456789';
  let otp = '';
  for (let i = 0; i < digits; i++) {
    otp += otpDigits[Math.floor(Math.random() * otpDigits.length)];
  }
  return otp;
}

// Function to write to the UserLog Table with provided parameters
async function writeToUserLog(userid, logaction, compid, isweb) {
  const currentDate = new Date();
  const logdate = currentDate.toISOString().split('T')[0];
  const logtime = currentDate.toISOString().split('T')[1].split('.')[0];

  // Your logic to write to the UserLog Table goes here...
  // Replace the below console.log with your database query to insert the record.

  const insertQuery = 'INSERT INTO "Userlog" (userid, logdate, logtime, logaction, compid, isweb) VALUES ($1, $2, $3, $4, $5, $6)';

  await pool.query(insertQuery, [userid, logdate, logtime, logaction, compid, isweb]);

}


/**
 * Function to send an email to a specified email address.
 * @param {string} emailTo - The email address of the recipient.
 * @param {string} subject - The subject of the email.
 * @param {string} text - The plain text body of the email.
 * @returns {Promise<string>} - A Promise that resolves to a success message if the email is sent successfully.
 * @throws {Error} - If there is an error sending the email.
 */
async function sendEmail(emailTo, subject, text) {
  if (!emailTo || !subject || !text) {
    console.log(emailTo);
    console.log(subject);
    console.log(text);
    throw new Error('Invalid request or missing parameters');
  }

  try {
    // Create a transporter object using SMTP transport method
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com', // Your SMTP server host
      port: 465, // Your SMTP server port
      secure: true, // Use TLS (true for 465, false for other ports)
      auth: {
        user: 'kfinvoice', // Your SMTP username
        pass: 'Kf!12345678', // Your SMTP password
      },
    });

    // Set up email data
    const mailOptions = {
      from: 'kfinvoice@knowforth.in', // Sender's email address
      to: emailTo, // Recipient's email address
      subject: subject, // Subject of the email
      text: text, // Plain text body of the email
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return 'Email sent successfully';
  } catch (err) {
    console.error(err);
    throw new Error('Internal server error');
  }
}

// Example usage:
// sendEmail('recipient@example.com', 'Test Email', 'This is a test email')
//   .then((result) => console.log(result))
//   .catch((err) => console.error(err.message));

/**
 * Function to send an SMS through the Textlocal SMS service.
 * @param {string} message - The text message to be sent.
 * @param {string} numbers - Comma-separated phone numbers to receive the SMS (e.g., '1234567890,9876543210').
 * @returns {Promise<string>} - A Promise that resolves to a success message if the SMS is sent successfully.
 * @throws {Error} - If there is an error sending the SMS.
 */
async function sendSMS( message, numbers) {
  try {
    const url = 'https://api.textlocal.in/send/';
    const apiKey = 'jCos0jGuAPE-PdFyiAqkxPoKFq7wzLSzqr9con60HH';
    const sender = '919999741939';

    const params = new URLSearchParams({
      apikey: apiKey,
      sender: sender,
      message: message,
      numbers: numbers,
    });

    const response = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.data.status === 'success') {
      return 'SMS sent successfully';
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (err) {
    console.error(err);
    throw new Error('Failed to send SMS');
  }
}

// Example usage:
// sendSMS('YOUR_API_KEY', 'SENDER_NAME', 'This is a test SMS', '1234567890,9876543210')
//   .then((result) => console.log(result))
//   .catch((err) => console.error(err.message));

/**
 * Function to save a picture and return the URL of the saved picture.
 * @param {string} pictureFile - The picture file to save.
 * @returns {Promise<string>} - A Promise that resolves to the URL of the saved picture.
 * @throws {Error} - If there is an error saving the picture.
 */
async function savePicture(pictureFile, picname) {
  return new Promise(async (resolve, reject) => {
    const tempPath = pictureFile.path;

    const targetPath = path.join(__dirname, 'profilepic/', picname);

    try {
      // Resize the image to 90x90 pixels using sharp
      await sharp(tempPath).resize(90, 90).toFile(targetPath);      

      resolve(targetPath);
    } catch (err) {
      console.error(err);
      reject(new Error('Failed to save and resize the picture'));
    }
  });
}

/**
 * Fetch the picture based on the picture path provided.
 * @param {string} picturePath - The path of the picture to fetch.
 * @returns {Promise<Buffer>} - A Promise that resolves to the picture data as a Buffer.
 * @throws {Error} - If there is an error reading the picture file.
 */
function fetchPicture(picturepath) {
  return new Promise((resolve, reject) => {

    
    const picPath = path.join(__dirname, picturepath);
    fs.readFile(picPath, (err, data) => {
      if (err) {
        console.error(err);
        reject(new Error('Failed to fetch the picture'));
        return;
      }

      const extension = path.extname(picPath).toLowerCase();
      let contentType = 'application/octet-stream'; // Default content type

      // Determine the content type based on the image extension
      if (extension === '.jpg' || extension === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (extension === '.png') {
        contentType = 'image/png';
      } else if (extension === '.gif') {
        contentType = 'image/gif';
      } else if (extension === '.webp') {
        contentType = 'image/webp';
      }


      resolve({ contentType, data }) ;

    });
  });
}

/**
 * Deletes all files in the specified folder.
 * @param {string} folderPath - The path of the folder to delete files from.
 * @returns {Promise<void>} - A promise that resolves when all files are deleted.
 */
async function deleteFilesInFolder(folderPath) {
  try {
    // Read the contents of the folder
    const files = await fs.promises.readdir(folderPath);

    // Loop through the files and delete each one
    for (const file of files) {
      const filePath = path.join(folderPath, file);

      // Use fs.unlinkSync for synchronous deletion
      // fs.unlink(filePath, (err) => {
      //   if (err) throw err;
      //   console.log(`${file} was deleted successfully`);
      // });

      // Use fs.promises.unlink for asynchronous deletion
      await fs.promises.unlink(filePath);
      console.log(`${file} was deleted successfully`);
    }

    console.log('All files in the folder have been deleted.');
  } catch (err) {
    console.error(err);
    throw new Error('Failed to delete files in the folder');
  }
}

// Example usage:
  
module.exports = { generateOTP, writeToUserLog, sendEmail, sendSMS, savePicture, fetchPicture, deleteFilesInFolder };
