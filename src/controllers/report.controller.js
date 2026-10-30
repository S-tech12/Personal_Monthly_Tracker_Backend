import * as reportService from '../services/report.service.js';

export const sendCurrentMonthReport = async (req, res, next) => {
  try {
    await reportService.sendCurrentMonthReport(req.user._id);
    return res.status(200).json({ success: true, message: "Report sent to your email" });
  } catch (error) {
    next(error);
  }
};

export const sendVoiceRequestedReport = async (req, res, next) => {
  try {
    let { transcript } = req.body;
    const errors = {};

    if (transcript === undefined || transcript === null || (typeof transcript === 'string' && transcript.trim() === '')) {
      errors.transcript = 'Transcript is required';
    } else if (typeof transcript !== 'string') {
      errors.transcript = 'Transcript must be a string';
    } else if (transcript.trim().length > 500) {
      errors.transcript = 'Transcript is too long';
    } else {
      transcript = transcript.trim();
      req.body.transcript = transcript;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: errors
      });
    }

    const { periodLabel } = await reportService.sendVoiceRequestedReport(req.user._id, transcript);
    return res.status(200).json({ 
      success: true, 
      message: `Report for ${periodLabel} sent to your email`, 
      data: { periodLabel } 
    });
  } catch (error) {
    next(error);
  }
};
