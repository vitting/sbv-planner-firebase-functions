import * as functions from 'firebase-functions';
// tslint:disable-next-line: no-duplicate-imports
// import { Change } from 'firebase-functions';
import * as nodemailer from "nodemailer";
import * as admin from 'firebase-admin';

/**
 * Set email and email password
 * firebase functions:config:set gmail.email="myusername@gmail.com" gmail.password="secretpassword"
 * 
 * firebase functions:config:set mode.development="true"
 * 
 * firebase functions:config:set mode.developmentemail="email@mail.com"
 * 
 * firebase deploy --only functions
 */


admin.initializeApp();
const development = functions.config().mode.development === "true";
// const db = admin.firestore();
// const auth = admin.auth();
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailEmail,
        pass: gmailPassword
    }
}, {
        from: "Silkeborg Beachvolley silkeborgbeachvolley@gmail.com",
    });

// export const sendUserCreatedMail = functions.auth.user().onCreate(async (user, context) => {

// });

export const sendUserCreatedMail = functions.firestore.document("/users/{documentId}").onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) => {
    // const userId: string = snap.get("id");
    const nameOfUser: string = snap.get("name");
    // const authUser = await auth.getUser(userId);
    // let userEmail = authUser.email;
    let userEmail = "cvn_vitting@hotmail.com";

    console.log("USERCREATED", userEmail);
    
    if (development) {
        const devEmail = functions.config().mode.developmentemail;
        console.log("USE DEVELOPMENT EMAIL", devEmail);
        userEmail = devEmail;
    }
    
    const mailOptions: nodemailer.SendMailOptions = {
        to: userEmail, // "mail@mail.dk, mail2@mail.dk"
        subject: 'Du er blevet oprettet i SBV Planner',
        text: `Hej ${nameOfUser} \nDu er blevet oprettet. Men før du kan bruge SBV Planner skal du godkendes af en Administrator`,
        html: `<h3>Hej ${nameOfUser}</h3><p>Du er blevet oprettet. Men før du kan bruge SBV Planner skal du godkendes af en Administrator</p>`
    
    };

    try {
        await transporter.sendMail(mailOptions).then()
    } catch (error) {
        console.error("sendUserCreatedMail", error);
    }

    return null;
});

// export const sendUserAcceptedMail = functions.firestore.document("/users/{documentId}").onUpdate((change: Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) => {
//     // const change.before.data
//     return null;
// });