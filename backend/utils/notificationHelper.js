const { DirectMessage, User, Role, UserRole } = require('../models');

/**
 * Send automated DirectMessage notification for a new meeting request
 * @param {string} professorId - UUID of the professor
 * @param {string} studentName - Full name of the student
 * @param {string} meetingDate - Requested meeting date (YYYY-MM-DD)
 * @param {string} meetingTime - Requested meeting time (HH:MM:SS)
 * @param {string} reason - Reason for the meeting
 * @returns {Promise<DirectMessage>} Created message
 */
async function sendMeetingRequestNotification(professorId, studentName, meetingDate, meetingTime, reason) {
  try {
    // Find or create a system user for automated messages
    const systemUser = await getOrCreateSystemUser();
    
    const formattedDate = new Date(meetingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = formatTime(meetingTime);
    
    const messageBody = `📅 **New Meeting Request**\n\nYou have received a meeting request from **${studentName}**.\n\n**Requested Date:** ${formattedDate}\n**Requested Time:** ${formattedTime}\n**Reason:** ${reason}\n\nPlease review this request in your Meeting Requests page.`;
    
    const message = await DirectMessage.create({
      senderId: systemUser.id,
      recipientId: professorId,
      body: messageBody,
    });
    
    return message;
  } catch (error) {
    console.error('Error sending meeting request notification:', error);
    throw error;
  }
}

/**
 * Send automated DirectMessage notification for approved meeting request
 * @param {string} studentId - UUID of the student
 * @param {string} professorName - Full name of the professor
 * @param {string} confirmedDate - Confirmed meeting date
 * @param {string} confirmedTime - Confirmed meeting time
 * @param {string} notes - Professor's notes (optional)
 * @returns {Promise<DirectMessage>} Created message
 */
async function sendMeetingApprovedNotification(studentId, professorName, confirmedDate, confirmedTime, notes = '') {
  try {
    const systemUser = await getOrCreateSystemUser();
    
    const formattedDate = new Date(confirmedDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = formatTime(confirmedTime);
    
    let messageBody = `✅ **Meeting Request Approved**\n\nYour meeting request with **${professorName}** has been approved.\n\n**Confirmed Date:** ${formattedDate}\n**Confirmed Time:** ${formattedTime}`;
    
    if (notes && notes.trim()) {
      messageBody += `\n\n**Professor's Notes:** ${notes}`;
    }
    
    messageBody += '\n\nPlease be on time for your meeting.';
    
    const message = await DirectMessage.create({
      senderId: systemUser.id,
      recipientId: studentId,
      body: messageBody,
    });
    
    return message;
  } catch (error) {
    console.error('Error sending meeting approved notification:', error);
    throw error;
  }
}

/**
 * Send automated DirectMessage notification for declined meeting request
 * @param {string} studentId - UUID of the student
 * @param {string} professorName - Full name of the professor
 * @param {string} notes - Professor's notes explaining the decline
 * @returns {Promise<DirectMessage>} Created message
 */
async function sendMeetingDeclinedNotification(studentId, professorName, notes = '') {
  try {
    const systemUser = await getOrCreateSystemUser();
    
    let messageBody = `❌ **Meeting Request Declined**\n\nYour meeting request with **${professorName}** has been declined.`;
    
    if (notes && notes.trim()) {
      messageBody += `\n\n**Reason:** ${notes}`;
    }
    
    messageBody += '\n\nYou may submit a new meeting request if needed.';
    
    const message = await DirectMessage.create({
      senderId: systemUser.id,
      recipientId: studentId,
      body: messageBody,
    });
    
    return message;
  } catch (error) {
    console.error('Error sending meeting declined notification:', error);
    throw error;
  }
}

/**
 * Get or create a system user for automated messages
 * @returns {Promise<User>} System user
 */
async function getOrCreateSystemUser() {
  // Check if system user exists
  let systemUser = await User.findOne({
    where: { email: 'system@uums.edu' }
  });
  
  if (!systemUser) {
    // Find or create a system role
    let systemRole = await Role.findOne({ where: { name: 'system' } });
    
    if (!systemRole) {
      systemRole = await Role.create({
        name: 'system',
        description: 'System automated user for notifications'
      });
    }
    
    // Create system user without roleId (multi-role pattern)
    systemUser = await User.create({
      fullName: 'UUMS System',
      email: 'system@uums.edu',
      password: 'N/A', // System user doesn't need a real password
      isActive: true,
    });

    // Assign system role through UserRole join table
    await UserRole.create({
      userId: systemUser.id,
      roleId: systemRole.id
    });
  }
  
  return systemUser;
}

/**
 * Format time from HH:MM:SS to human-readable format
 * @param {string} timeString - Time in HH:MM:SS format
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
function formatTime(timeString) {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  
  return `${displayHour}:${displayMinute} ${period}`;
}

module.exports = {
  sendMeetingRequestNotification,
  sendMeetingApprovedNotification,
  sendMeetingDeclinedNotification,
  getOrCreateSystemUser,
};
