// ok so this is just model import lines
import Expense from '../models/Expense.model.js';
import User from '../models/user.model.js';

// this is the pdfkit module import to make PDF.
import PDFDocument from 'pdfkit';

// this is the function import that send the mail to the user's email id
import { transporter } from '../config/mailer.js';

// this is the notification generation function i am not aware about which type of notification it is
import { createNotification } from './notification.service.js';

// this is just library import
import dayjs from 'dayjs';

// this is familyService function import i am not aware about this
import { familyService } from './family.service.js';

// import mongoose module i am not aware about this like why it is used in this function
import mongoose from 'mongoose';


// this is the main function which is responsible to generate the expenses for the monthly and weekly
export const getExpensesGroupedByDay = async (targetUserIds, startDate, endDate) => {
  const pipeline = [
    {
      // first it will match the document that is the userId in the document is in the array which comes from the parameter and then also the expenseDate is greater then startDate and less then endDate then it will take it
      $match: {
        userId: { $in: targetUserIds },
        expenseDateTime: { $gte: startDate, $lte: endDate }
      }
    },

    // then it will join the expense collection and user collection by $lookup
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'addedBy'
      }
    },

    // i am not aware about this i mean what it does from here
    {
      $unwind: {
        path: '$addedBy',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$expenseDateTime" } },
          currency: "$currency"
        },
        expenses: { $push: "$$ROOT" },
        totalAmount: { $sum: "$amount" }
      }
    },
    {
      $group: {
        _id: "$_id.date",
        currencies: {
          $push: {
            currency: "$_id.currency",
            totalAmount: "$totalAmount",
            expenses: "$expenses"
          }
        }
      }
    },

    // at the end all over the document will be sorted based on the id's value
    {
      $sort: { _id: 1 }
    }
  ];

  // finally all the documents will be fetched from expense collection and returned it ...
  return Expense.aggregate(pipeline);
};


// it will get the expenses per person in the family
export const getPerPersonTotals = async (targetUserIds, startDate, endDate) => {
  const pipeline = [
    {
      // first it will match the document that is the userId in the document is in the array which comes from the parameter and then also the expenseDate is greater then startDate and less then endDate then it will take it
      $match: {
        userId: { $in: targetUserIds },
        expenseDateTime: { $gte: startDate, $lte: endDate }
      }
    },

    // i am not aware about this from here
    {
      $group: {
        _id: { userId: "$userId", currency: "$currency" },
        total: { $sum: "$amount" }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: "$user"
    },
    {
      $project: {
        _id: 0,
        userName: "$user.name",
        currency: "$_id.currency",
        total: 1
      }
    }
  ];

  return Expense.aggregate(pipeline);
};


// this function is used to generate the pdf and send to the function sendScheduledReport so that it will send the pdf to the registered email id
export const generateReportPdfBuffer = (user, groupedExpenses, periodLabel, perPersonTotals = []) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const colX = { index: 50, type: 90, title: 190, amount: 440 };
      const colW = { index: 40, type: 100, title: 250, amount: 105 };

      // Helper to generate a header banner
      const generateHeader = () => {
        doc.rect(0, 0, doc.page.width, 100).fill('#f8fafc');
        doc.fill('#0f172a');
        doc.font('Helvetica-Bold').fontSize(24).text('VoiceSpend', 50, 30);
        doc.font('Helvetica').fontSize(12).text(periodLabel, 50, 60);
        
        doc.font('Helvetica-Bold').fontSize(12).text('Prepared For:', 350, 30, { width: 195, align: 'right' });
        doc.font('Helvetica').fontSize(12).text(user.name || user.email, 350, 45, { width: 195, align: 'right' });
        
        doc.y = 120;
      };

      // Helper to generate the table header row
      const generateTableHeader = () => {
        doc.rect(50, doc.y, 495, 25).fill('#e2e8f0');
        doc.fill('#0f172a').font('Helvetica-Bold').fontSize(10);
        const y = doc.y + 7;
        doc.text('#', colX.index, y, { width: colW.index });
        doc.text('Category', colX.type, y, { width: colW.type });
        doc.text('Title', colX.title, y, { width: colW.title });
        doc.text('Amount', colX.amount, y, { width: colW.amount, align: 'right' });
        doc.y += 20;
      };

      generateHeader();
      generateTableHeader();

      let isEvenRow = true;
      let rowIndex = 1;
      const grandTotals = {};

      if (groupedExpenses.length === 0) {
        doc.moveDown(2);
        doc.font('Helvetica-Oblique').fontSize(12).fill('#64748b').text('No expenses found for this period.', 50, doc.y, { align: 'center' });
      } else {
        groupedExpenses.forEach(dayGroup => {
          // Check for page break
          if (doc.y > 700) {
            doc.addPage();
            generateHeader();
            generateTableHeader();
          }

          // Date Sub-header
          doc.moveDown(1);
          doc.font('Helvetica-Bold').fontSize(12).fill('#0f172a').text(dayGroup._id, 50, doc.y);
          doc.moveDown(0.5);

          dayGroup.currencies.forEach(currGroup => {
            currGroup.expenses.forEach(exp => {
              // Row background
              if (doc.y > 750) {
                doc.addPage();
                generateHeader();
                generateTableHeader();
              }
              
              if (isEvenRow) {
                doc.rect(50, doc.y, 495, 20).fill('#f8fafc');
              }
              isEvenRow = !isEvenRow;

              const y = doc.y + 5;
              doc.fill('#334155').font('Helvetica').fontSize(10);
              doc.text(rowIndex.toString(), colX.index, y, { width: colW.index });
              doc.text(exp.category, colX.type, y, { width: colW.type });
              
              let titleText = exp.title;
              if (exp.addedBy && exp.addedBy._id && exp.addedBy._id.toString() !== user._id.toString()) {
                titleText += ` (added by ${exp.addedBy.name})`;
              }
              doc.text(titleText, colX.title, y, { width: colW.title });
              
              // Formatting currency amount
              const amountStr = `${exp.amount.toFixed(2)} ${exp.currency}`;
              doc.text(amountStr, colX.amount, y, { width: colW.amount, align: 'right' });

              doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
              doc.y += 5;
              rowIndex++;
            });

            // Currency Subtotal
            if (doc.y > 760) {
              doc.addPage();
              generateHeader();
              generateTableHeader();
            }
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fontSize(10).fill('#0f172a');
            doc.text(`Subtotal (${currGroup.currency}):`, colX.title, doc.y, { width: colW.title, align: 'right' });
            doc.text(`${currGroup.totalAmount.toFixed(2)} ${currGroup.currency}`, colX.amount, doc.y - 12, { width: colW.amount, align: 'right' });
            doc.moveDown(0.5);

            if (!grandTotals[currGroup.currency]) {
              grandTotals[currGroup.currency] = 0;
            }
            grandTotals[currGroup.currency] += currGroup.totalAmount;
          });
        });

        // Grand Totals
        doc.moveDown(2);
        if (doc.y > 700) {
          doc.addPage();
          generateHeader();
        }
        
        doc.rect(50, doc.y, 495, 2).fill('#94a3b8');
        doc.y += 10;
        doc.font('Helvetica-Bold').fontSize(14).fill('#0f172a');
        doc.text('Grand Totals', 50, doc.y);
        doc.moveDown(0.5);

        for (const [currency, total] of Object.entries(grandTotals)) {
          doc.font('Helvetica').fontSize(12).fill('#334155');
          doc.text(currency, colX.title, doc.y, { width: colW.title, align: 'right' });
          doc.font('Helvetica-Bold').fill('#0f172a');
          doc.text(`${total.toFixed(2)}`, colX.amount, doc.y - 14, { width: colW.amount, align: 'right' });
          doc.moveDown(0.2);
        }

        // --- NEW SECTION: Total by Person ---
        if (perPersonTotals && perPersonTotals.length > 0) {
          doc.moveDown(3);
          if (doc.y > 650) {
            doc.addPage();
            generateHeader();
          }
          
          doc.rect(50, doc.y, 495, 2).fill('#94a3b8');
          doc.y += 10;
          doc.font('Helvetica-Bold').fontSize(14).fill('#0f172a');
          doc.text('Total by Person', 50, doc.y);
          doc.moveDown(0.5);

          // Group perPersonTotals by currency
          const totalsByCurrency = {};
          perPersonTotals.forEach(item => {
            if (!totalsByCurrency[item.currency]) {
              totalsByCurrency[item.currency] = [];
            }
            totalsByCurrency[item.currency].push(item);
          });

          for (const [currency, users] of Object.entries(totalsByCurrency)) {
            doc.font('Helvetica-Bold').fontSize(12).fill('#334155');
            doc.text(`Currency: ${currency}`, 50, doc.y);
            doc.moveDown(0.2);

            users.forEach(u => {
              doc.font('Helvetica').fontSize(11).fill('#334155');
              doc.text(u.userName || 'Unknown User', colX.title, doc.y, { width: colW.title, align: 'right' });
              doc.font('Helvetica-Bold').fill('#0f172a');
              doc.text(`${u.total.toFixed(2)}`, colX.amount, doc.y - 13, { width: colW.amount, align: 'right' });
              doc.moveDown(0.2);
            });
            doc.moveDown(0.5);
          }
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export const sendScheduledReport = async (user, groupedExpenses, periodLabel, perPersonTotals = []) => {
  // first get the pdf from function
  const pdfBuffer = await generateReportPdfBuffer(user, groupedExpenses, periodLabel, perPersonTotals);
  
  // create the object that will used to send the registered email id
  const mailOptions = {
    from: `"VoiceSpend" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Your VoiceSpend ${periodLabel}`,
    text: `Please find attached your ${periodLabel}.`,
    attachments: [
      {
        filename: `${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        content: pdfBuffer
      }
    ]
  };

  // it will send the mail
  await transporter.sendMail(mailOptions);
  
  // i don't know about this.
  await createNotification(user._id, "report-sent", `Your ${periodLabel} has been sent to your email.`);
};

// it will used to send the expense report of the current month
export const sendCurrentMonthReport = async (userId) => {
  // first it will fetch the current month's start date
  const startDate = dayjs().startOf('month').toDate();

  // end date will be our current date
  const endDate = new Date();

  // i don't know from this
  const targetUserIds = await familyService.getVisibleUserIds(userId);
  const objectIdTargetUserIds = targetUserIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id);


  const groupedExpenses = await getExpensesGroupedByDay(objectIdTargetUserIds, startDate, endDate);
  const perPersonTotals = await getPerPersonTotals(objectIdTargetUserIds, startDate, endDate);

  if (!groupedExpenses || groupedExpenses.length === 0) {
    const error = new Error("No expenses found for this month yet");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const startLabel = dayjs(startDate).format('D MMM');
  const endLabel = dayjs(endDate).format('D MMM YYYY');
  const periodLabel = `Report (${startLabel} - ${endLabel})`;

  const pdfBuffer = await generateReportPdfBuffer(user, groupedExpenses, periodLabel, perPersonTotals);

  const mailOptions = {
    from: `"VoiceSpend" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Your VoiceSpend Report (${startLabel} - ${endLabel})`,
    text: `Please find attached your current month's report (${startLabel} - ${endLabel}).`,
    attachments: [
      {
        filename: `Report_${startLabel.replace(/ /g, '_')}_to_${endLabel.replace(/ /g, '_')}.pdf`,
        content: pdfBuffer
      }
    ]
  };

  await transporter.sendMail(mailOptions);
  await createNotification(userId, "report-sent", `Your current month's report (${startLabel} - ${endLabel}) has been sent to your email.`);

  return { success: true };
};

export const sendVoiceRequestedReport = async (userId, transcript) => {
  const { parseReportRequest } = await import('./gemini.service.js');
  
  const todayStr = dayjs().format('YYYY-MM-DD');
  const { startDate, endDate, scope } = await parseReportRequest(transcript, todayStr);

  const result = await generateAndSendReport(userId, startDate, endDate, scope);
  return result;
};

export const generateAndSendReport = async (userId, startDate, endDate, scope) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const start = dayjs(startDate).startOf('day').toDate();
  const end = dayjs(endDate).endOf('day').toDate();

  const visibleUserIds = await familyService.getVisibleUserIds(userId);
  let targetUserIds = [];

  if (scope === 'others_only') {
    targetUserIds = visibleUserIds.filter(id => id.toString() !== userId.toString());
  } else if (scope === 'self_only') {
    targetUserIds = [userId];
  } else {
    targetUserIds = visibleUserIds;
  }

  // Convert to ObjectIds if they aren't already
  const objectIdTargetUserIds = targetUserIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id);

  const groupedExpenses = await getExpensesGroupedByDay(objectIdTargetUserIds, start, end);
  const perPersonTotals = await getPerPersonTotals(objectIdTargetUserIds, start, end);

  if (!groupedExpenses || groupedExpenses.length === 0) {
    const error = new Error("No expenses found in that date range");
    error.statusCode = 400;
    throw error;
  }

  const startLabel = dayjs(start).format('D MMM YYYY');
  const endLabel = dayjs(end).format('D MMM YYYY');
  
  const datesLabel = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  
  let periodLabel;
  if (scope === 'others_only') {
    periodLabel = `Family Report (excluding you): ${datesLabel}`;
  } else if (scope === 'self_only') {
    periodLabel = `Your Report: ${datesLabel}`;
  } else {
    periodLabel = `Family Report: ${datesLabel}`;
  }

  const pdfBuffer = await generateReportPdfBuffer(user, groupedExpenses, periodLabel, perPersonTotals);

  const mailOptions = {
    from: `"VoiceSpend" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Your VoiceSpend ${periodLabel}`,
    text: `Please find attached your requested report: ${periodLabel}.`,
    attachments: [
      {
        filename: `${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        content: pdfBuffer
      }
    ]
  };

  await transporter.sendMail(mailOptions);
  await createNotification(userId, "report-sent", `Your requested report (${periodLabel}) has been sent to your email.`);

  return { periodLabel };
};
