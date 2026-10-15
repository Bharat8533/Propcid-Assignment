// Official 28 States and 8 Union Territories of India
export const INDIAN_STATES_AND_UTS = [
  // 28 States
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // 8 Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

// Required Languages (At least 1 must be picked)
export const MANDATORY_LANGUAGES = [
  "English",
  "Hindi",
  "Marathi",
  "Gujarati",
  "Tamil",
  "Telugu",
  "Bengali",
  "Punjabi"
];

// Areas of Expertise (1 to 3 must be selected)
export const AREAS_OF_EXPERTISE = [
  "Luxury Properties",
  "High-Rise Apartments",
  "Commercial Leasing",
  "Farmhouses & Land",
  "Affordable Housing",
  "Industrial Spaces"
];

// Company Types for Builders
export const COMPANY_TYPES = [
  "Private Limited",
  "LLP",
  "Partnership",
  "Proprietorship"
];

// Demo staff users as specified in problem statement
export const DEMO_STAFF_USERS = [
  {
    id: 1,
    name: "Asha Admin",
    email: "admin@test.com",
    role: "admin",
    password: "Admin@123",
    description: "Full report access, delete with reason, cannot create/edit"
  },
  {
    id: 2,
    name: "Vikram Agent",
    email: "vikram@test.com",
    role: "agent",
    password: "Agent@123",
    description: "Can register builders/brokers, edit/submit own drafts"
  },
  {
    id: 3,
    name: "Meera Agent",
    email: "meera@test.com",
    role: "agent",
    password: "Agent@123",
    description: "Can register builders/brokers, edit/submit own drafts"
  }
];
