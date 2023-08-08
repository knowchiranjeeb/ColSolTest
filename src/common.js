const nodemailer = require('nodemailer');
const axios = require('axios');
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const util = require('util');

const readdirAsync = util.promisify(fs.readdir);
const unlinkAsync = util.promisify(fs.unlink);
/*
const emailHost = process.env.EMAIL_HOST;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASSWORD;
const smsSender = process.env.SMS_SENDER;
const smsURL = process.env.SMS_URL;
const smsAPI = process.env.SMS_API;
*/
const emailHost = 'smtp.hostinger.com';
const emailUser = 'kfinvoice@knowforth.in';
const emailPass = 'Kf!12345678';
const smsSender = 'AMBONG';
const smsURL = 'https://api.textlocal.in/send/?';
const smsAPI = 'jCos0jGuAPE-PdFyiAqkxPoKFq7wzLSzqr9con60HH';

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
    throw new Error('Invalid request or missing parameters');
  }

  try {
    // Create a transporter object using SMTP transport method
    const transporter = nodemailer.createTransport({
      host: emailHost, // Your SMTP server host
      port: 465, // Your SMTP server port
      secure: true, // Use TLS (true for 465, false for other ports)
      auth: {
        user: emailUser, // Your SMTP username
        pass: emailPass, // Your SMTP password
      },
    });

    // Set up email data
    const mailOptions = {
      from: emailUser, // Sender's email address
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
    const url = smsURL;
    const apiKey = smsAPI;
    const sender = smsSender;

    const params = new URLSearchParams({
      apikey: apiKey,
      message: message,
      sender: sender,
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

// Function to delete files in a folder only if they are not busy or locked
async function deleteTempFiles(folderPath) {
  try {
    const files = await readdirAsync(folderPath);
    for (const file of files) {
      const filePath = `${folderPath}/${file}`;
      try {
        await unlinkAsync(filePath);
        console.log(`File ${file} deleted successfully.`);
      } catch (error) {
        if (error.code === 'EBUSY') {
          console.log(`File ${file} is busy or locked. Skipping deletion.`);
        } else {
          console.error(`Error deleting file ${file}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error reading folder:', error.message);
  }
}

// Function to save the  picture in the "uploads" folder
async function savePicToUploads(id, picture, type) {
  const folderPath = path.join(__dirname, 'uploads');
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
  let picturePath;
  if (type === 'User')
  {
    picturePath = path.join(folderPath, `U${id}.jpg`);
  }
  else
  {
    picturePath = path.join(folderPath, `CL${id}.jpg`);
  }
  await util.promisify(fs.writeFile)(picturePath, picture);
  return picturePath;
}

// Function to fetch the picture from the "uploads" folder
async function getPicFromUploads(id, type) {
  const folderPath = path.join(__dirname, 'uploads');
  let picturePath;
  if (type === 'User')
  {
    picturePath = path.join(folderPath, `U${id}.jpg`);
  }
  else
  {
    picturePath = path.join(folderPath, `CL${id}.jpg`);
  }
  try {
    const pictureData = await util.promisify(fs.readFile)(picturePath);
    return pictureData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // Return null if the picture file does not exist
    }
    throw error;
  }
}

module.exports = { generateOTP, writeToUserLog, sendEmail, sendSMS, deleteTempFiles, savePicToUploads, getPicFromUploads };
