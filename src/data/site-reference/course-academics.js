// Illustrative content for the website preview, not confirmed faculty or syllabuses.
const module = (title, topics) => ({ title, topics });
const teacher = (name, role, subjects) => ({ name, role, subjects });

export const courseAcademics = {
  nda: {
    syllabus: [
      module("Mathematics foundations", ["Algebra and equations", "Geometry and trigonometry practice", "Percentages and numerical problem solving"]),
      module("General learning and awareness", ["English comprehension and vocabulary", "Science and general awareness practice", "Reading and revision activities"]),
      module("Physical preparation and study planning", ["Foundational conditioning and movement", "Preparation goals and weekly study habits", "Practice tests and review"]),
    ],
    teachers: [teacher("Arjun Sharma", "Mathematics teacher", ["Mathematics foundations", "Numerical practice"]), teacher("Priya Nair", "Academic preparation teacher", ["English", "General awareness", "Study planning"])],
  },
  cds: {
    syllabus: [
      module("Written preparation", ["English language practice", "General awareness", "Quantitative foundations and problem solving"]),
      module("Selection preparation", ["Communication and self-reflection", "Group discussion practice", "Interview preparation activities"]),
      module("Revision and testing", ["Topic-based revision", "Practice tests", "Reviewing mistakes and planning improvements"]),
    ],
    teachers: [teacher("Vikram Singh", "Written preparation teacher", ["Quantitative foundations", "General awareness"]), teacher("Ananya Iyer", "English and communication teacher", ["English", "Communication practice"])],
  },
  ssb: {
    syllabus: [
      module("Psychological preparation", ["Self-reflection activities", "Written preparation exercises", "Review and discussion"]),
      module("Group-task orientation", ["Collaboration and discussion", "Group planning activities", "Constructive participation and reflection"]),
      module("Individual preparation", ["Personal introduction", "Communication and interview practice", "Coaching feedback and improvement planning"]),
    ],
    teachers: [teacher("Rohit Menon", "Preparation mentor", ["Group-task orientation", "Interview practice"]), teacher("Kavya Rao", "Communication teacher", ["Self-reflection", "Communication", "Written practice"])],
  },
  afcat: {
    syllabus: [
      module("Language and general awareness", ["English comprehension", "Vocabulary practice", "General awareness activities"]),
      module("Reasoning and numerical practice", ["Logical reasoning exercises", "Numerical foundations", "Problem-solving practice"]),
      module("Preparation and review", ["Study priorities", "Practice tests", "Revision and progress review"]),
    ],
    teachers: [teacher("Aditya Kulkarni", "Reasoning teacher", ["Reasoning", "Numerical practice"]), teacher("Sneha Joshi", "Language and awareness teacher", ["English", "General awareness"])],
  },
  acc: {
    syllabus: [
      module("Academic foundations", ["English language practice", "Numerical foundations", "General learning activities"]),
      module("Pathway preparation", ["Preparation goals and questions", "Communication activities", "Individual study priorities"]),
      module("Structured practice", ["Weekly revision", "Practice tests", "Review and mentor discussion"]),
    ],
    teachers: [teacher("Rahul Verma", "Academic preparation teacher", ["Numerical foundations", "Practice and revision"]), teacher("Pooja Desai", "Learning mentor", ["English", "Communication", "Study planning"])],
  },
  "ncc-entry": {
    syllabus: [
      module("Entry-route guidance", ["Understanding the supported pathway", "Preparing questions about official requirements", "Organising application information"]),
      module("Preparation planning", ["Personal preparation goals", "Communication and self-reflection", "Group discussion practice"]),
      module("Review and next steps", ["Practice activities", "Mentor discussion", "Individual action planning"]),
    ],
    teachers: [teacher("Karan Mehta", "Preparation mentor", ["Entry-route preparation", "Action planning"]), teacher("Ishita Kapoor", "Communication teacher", ["Communication", "Group discussion"])],
  },
  "communication-soft-skills": {
    syllabus: [
      module("Communication foundations", ["Active listening", "Clear spoken communication", "Structuring a message"]),
      module("Practical communication", ["Presentations and introductions", "Group discussion", "Writing and feedback activities"]),
      module("Soft skills in practice", ["Collaboration", "Interview practice", "Personal development planning"]),
    ],
    teachers: [teacher("Meera Krishnan", "Communication teacher", ["Spoken communication", "Presentations"]), teacher("Nikhil Bansal", "Soft-skills teacher", ["Collaboration", "Interview practice"])],
  },
  "ssb-mock-assessments": {
    syllabus: [
      module("Coaching simulations", ["Practice interview activities", "Group discussion scenarios", "Written self-reflection exercises"]),
      module("Practice and review", ["Reviewing preparation activities", "Individual coaching feedback", "Next-step action planning"]),
    ],
    teachers: [teacher("Siddharth Malhotra", "Practice mentor", ["Interview practice", "Group activities"]), teacher("Aditi Patil", "Learning review mentor", ["Self-reflection", "Feedback and action planning"])],
  },
  "in-service-guidance": {
    syllabus: [
      module("Supported-pathway guidance", ["Preparation goals", "Questions about entry-route requirements", "Organising preparation information"]),
      module("Individual preparation", ["Identifying learning priorities", "Study and communication practice", "Mentor discussion and action planning"]),
    ],
    teachers: [teacher("Sanjay Reddy", "Preparation mentor", ["Preparation planning", "Pathway guidance"]), teacher("Divya Saxena", "Learning mentor", ["Communication", "Individual learning plans"])],
  },
};

for (const details of Object.values(courseAcademics)) details.academicsSample = true;
