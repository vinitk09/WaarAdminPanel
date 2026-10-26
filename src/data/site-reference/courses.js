import { defenceProgrammes } from "./defence-programmes";

export const courses = [
  ...defenceProgrammes.map(programme => ({
    ...programme,
    category: "Defence",
    image: programme.slug === "communication-soft-skills" ? "/images/defence-learning-hero.png" : "/images/army-preparation-hero-v3.png",
    availability: "Confirm upcoming batch",
  })),
];

export const learningJourney = [
  { name: "Explore course details", detail: "Review the course overview and learning focus. Lessons, resources and tests stay locked." },
  { name: "Enrol and complete payment", detail: "Fill in the course enrolment form and complete payment to unlock that course in your learner account." },
  { name: "Follow your timetable", detail: "Use your assigned class schedule, session topics and learning resources." },
  { name: "Practise and review", detail: "Take your course test series, review answer explanations and track your saved results in the learning portal." },
];

export function courseEnquiry(course) {
  return `/contact?interest=${encodeURIComponent(course.interest)}&programme=${encodeURIComponent(course.title)}&source=courses`;
}
