export function getStatusLabel(status: string): string {
  switch (status) {
    case "NEW":
      return "New";
    case "IN_REVIEW":
      return "In Review";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

export function getChannelLabel(channel: string): string {
  switch (channel) {
    case "MANUAL":
      return "Manual Entry";
    case "PUBLIC_FORM":
      return "Public Form";
    case "QR_CODE":
      return "QR Code";
    case "WHATSAPP":
      return "WhatsApp";
    case "INSTAGRAM":
      return "Instagram";
    case "X":
      return "X";
    case "GOOGLE_REVIEW":
      return "Google Review";
    case "EMAIL":
      return "Gmail";
    case "FACEBOOK":
      return "Facebook";
    case "OTHER":
      return "Other";
    default:
      return channel;
  }
}

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case "LOW":
      return "Low";
    case "NORMAL":
      return "Normal";
    case "HIGH":
      return "High";
    case "URGENT":
      return "Urgent";
    default:
      return priority;
  }
}
