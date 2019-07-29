import * as functions from 'firebase-functions';
// tslint:disable-next-line: no-duplicate-imports
import { Change } from 'firebase-functions';
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
 * firebase functions:config:set mode.sendermail="sender@mail.com"
 * 
 * firebase functions:config:get
 * 
 * firebase deploy --only functions
 */


admin.initializeApp();
const development = functions.config().mode.development === "true";
const db = admin.firestore();
const auth = admin.auth();
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const senderMail = functions.config().mode.sendermail

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailEmail,
        pass: gmailPassword
    }
}, {
        from: senderMail,
    });

export const sendUserCreatedMail = functions.firestore.document("/users/{documentId}").onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) => {
    const userId: string = snap.get("id");
    const nameOfUser: string = snap.get("name");
    const authUser = await auth.getUser(userId);
    let userEmail = authUser.email;

    console.log("USERCREATED", userEmail);

    if (development) {
        const devEmail = functions.config().mode.developmentemail;
        console.log("USE DEVELOPMENT EMAIL", devEmail);
        userEmail = devEmail;
    }

    const mailOptions: nodemailer.SendMailOptions = {
        to: userEmail, // "mail1@mail.dk, mail2@mail.dk"
        subject: 'Du er blevet oprettet i SBV Planner',
        text: `Hej ${nameOfUser} \nDu er blevet oprettet. Men før du kan bruge SBV Planner skal du godkendes af en Administrator`,
        html: `<h3>Hej ${nameOfUser}</h3><p>Du er blevet oprettet. Men før du kan bruge SBV Planner skal du godkendes af en Administrator</p>`

    };

    try {
        await db.collection("appmetas").doc("app-meta").set({
            userToApproveLastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            usersToApprove: true
        }, {merge: true});

        await transporter.sendMail(mailOptions).then();
    } catch (error) {
        console.error("sendUserCreatedMail", error);
    }

    return null;
});

export const sendUserAcceptedMail = functions.firestore.document("/users/{documentId}").onUpdate(async (change: Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) => {
    const acceptedBefore: boolean = change.before.get("accepted");
    const acceptedAfter: boolean = change.after.get("accepted");
    
    try {
        const usersToApprove = await db.collection("users").where("waitingForApproval", "==", true).select("waitingForApproval").get();
        await db.collection("appmetas").doc("app-meta").set({
            usersToApprove: !usersToApprove.empty
        }, {merge: true});    
    } catch (error) {
        console.error("sendUserAcceptedMail", error);
    }
    

    if (acceptedBefore === false && acceptedAfter === true) {
        console.log("USER ACCEPT UPDATED", acceptedAfter);
        const userId: string = change.after.get("id");
        const nameOfUser: string = change.after.get("name");
        const authUser = await auth.getUser(userId);
        let userEmail = authUser.email;

        if (development) {
            const devEmail = functions.config().mode.developmentemail;
            console.log("USE DEVELOPMENT EMAIL", devEmail);
            userEmail = devEmail;
        }

        const mailOptions: nodemailer.SendMailOptions = {
            to: userEmail, // "mail1@mail.dk, mail2@mail.dk"
            subject: 'Du er blevet godkendt i SBV Planner',
            text: `Hej ${nameOfUser} \nDu er nu blevet godkendt. Du kan nu bruge SBV Planner`,
            html: `<h3>Hej ${nameOfUser}</h3><p>Du er nu blevet godkendt. Du kan nu bruge SBV Planner</p>`
        };

        try {
            await transporter.sendMail(mailOptions).then()
        } catch (error) {
            console.error("sendUserAcceptedMail", error);
        }
    }
    return null;
});

export const updateSummaryOnCommentCreate = functions.firestore.document("/comments/{documentId}").onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) => {
    const parentId = snap.get("parentId");
    const summaryRef = db.collection("summaries").doc(parentId);

    try {
        return db.runTransaction(async (transaction) => {
            const summary = await transaction.get(summaryRef);
            let numberOfcomments: number = summary.get("numberOfComments");
            console.log("Summary Comments Update", parentId, numberOfcomments, numberOfcomments + 1);
            return transaction.update(summaryRef, {
                numberOfComments: ++numberOfcomments,
                commentsUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
    } catch (error) {
        console.error("updateSummaryOnCommentCreate", error);
        return null;
    }
});

export const updateSummaryOnCommentDelete = functions.firestore.document("/comments/{documentId}").onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) => {
    const parentId = snap.get("parentId");
    const summaryRef = db.collection("summaries").doc(parentId);

    try {
        return db.runTransaction(async (transaction) => {
            const summary = await transaction.get(summaryRef);
            let numberOfcomments: number = summary.get("numberOfComments");
            console.log("Summary Comments Update", parentId, numberOfcomments, numberOfcomments - 1);
            return transaction.update(summaryRef, {
                numberOfComments: --numberOfcomments
            });
        });
    } catch (error) {
        console.error("updateSummaryOnCommentDelete", error);
        return null;
    }
});

export const updateSummaryOnTaskCreate = functions.firestore.document("/tasks/{documentId}").onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) => {
    const projectId = snap.get("projectId");
    const summaryRef = db.collection("summaries").doc(projectId);

    try {
        return db.runTransaction(async (transaction) => {
            const summary = await transaction.get(summaryRef);
            let numberOfItems: number = summary.get("numberOfItems");
            console.log("Summary Items Update", projectId, numberOfItems, numberOfItems + 1);
            return transaction.update(summaryRef, {
                numberOfItems: ++numberOfItems
            });
        });
    } catch (error) {
        console.error("updateSummaryOnTaskCreate", error);
        return null;
    }
});

export const updateSummaryOnTaskDelete = functions.firestore.document("/tasks/{documentId}").onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) => {
    const projectId = snap.get("projectId");
    const summaryRef = db.collection("summaries").doc(projectId);

    try {
        return db.runTransaction(async (transaction) => {
            const summary = await transaction.get(summaryRef);
            let numberOfItems: number = summary.get("numberOfItems");
            console.log("Summary Items Update", projectId, numberOfItems, numberOfItems - 1);
            return transaction.update(summaryRef, {
                numberOfItems: --numberOfItems
            });
        });
    } catch (error) {
        console.error("updateSummaryOnTaskDelete", error);
        return null;
    }
});

export const updateSummaryOnSubTaskCreate = functions.firestore.document("/subtasks/{documentId}").onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) => {
    const taskId = snap.get("taskId");
    const summaryRef = db.collection("summaries").doc(taskId);

    try {
        return db.runTransaction(async (transaction) => {
            const summary = await transaction.get(summaryRef);
            let numberOfItems: number = summary.get("numberOfItems");
            console.log("Summary Items Update", taskId, numberOfItems, numberOfItems + 1);
            return transaction.update(summaryRef, {
                numberOfItems: ++numberOfItems
            });
        });
    } catch (error) {
        console.error("updateSummaryOnSubTaskCreate", error);
        return null;
    }
});

export const updateSummaryOnSubTaskDelete = functions.firestore.document("/subtasks/{documentId}").onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) => {
    const taskId = snap.get("taskId");
    const summaryRef = db.collection("summaries").doc(taskId);

    try {
        return db.runTransaction(async (transaction) => {
            const summary = await transaction.get(summaryRef);
            let numberOfItems: number = summary.get("numberOfItems");
            console.log("Summary Items Update", taskId, numberOfItems, numberOfItems + 1);
            return transaction.update(summaryRef, {
                numberOfItems: --numberOfItems
            });
        });
    } catch (error) {
        console.error("updateSummaryOnSubTaskDelete", error);
        return null;
    }
});

export const updateSummaryOnTaskComplete = functions.firestore.document("/tasks/{documentId}").onUpdate(async (change, context) => {
    const projectId = change.after.get("projectId");
    const summaryRef = db.collection("summaries").doc(projectId);
    const completeBefore: boolean = change.before.get("completed");
    const completeAfter: boolean = change.after.get("completed");

    if (completeBefore !== completeAfter) {
        try {
            return db.runTransaction(async (transaction) => {
                const summary = await transaction.get(summaryRef);
                let numberOfItemsCompleted: number = summary.get("numberOfItemsCompleted");
                console.log("Summary Items Completed Update", projectId, numberOfItemsCompleted, numberOfItemsCompleted + 1);
                return transaction.update(summaryRef, {
                    numberOfItemsCompleted: completeAfter ? ++numberOfItemsCompleted : --numberOfItemsCompleted
                });
            });
        } catch (error) {
            console.error("updateSummaryOnTaskComplete", error);
            return null;
        }
    } else {
        return null;
    }
});

export const updateSummaryOnSubTaskComplete = functions.firestore.document("/subtasks/{documentId}").onUpdate(async (change, context) => {
    const taskId = change.after.get("taskId");
    const summaryRef = db.collection("summaries").doc(taskId);
    const completeBefore: boolean = change.before.get("completed");
    const completeAfter: boolean = change.after.get("completed");
    if (completeBefore !== completeAfter) {
        try {
            return db.runTransaction(async (transaction) => {
                const summary = await transaction.get(summaryRef);
                let numberOfItemsCompleted: number = summary.get("numberOfItemsCompleted");
                const numberOfItems: number = summary.get("numberOfItems");
                console.log("Summary Items Completed Update", taskId, numberOfItemsCompleted, numberOfItemsCompleted + 1);
                
                if (completeAfter && numberOfItems === numberOfItemsCompleted + 1) {
                    await db.collection("tasks").doc(taskId).update({
                        completed: true
                    });    
                } else if (!completeAfter && numberOfItems === numberOfItemsCompleted) {
                    await db.collection("tasks").doc(taskId).update({
                        completed: false
                    });    
                }

                return transaction.update(summaryRef, {
                    numberOfItemsCompleted: completeAfter ? ++numberOfItemsCompleted : --numberOfItemsCompleted
                });
            });
        } catch (error) {
            console.error("updateSimmaryOnSubTaskComplete", error);
            return null;
        }
    } else {
        return null;
    }
});
