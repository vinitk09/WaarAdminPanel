import { courseAcademics } from "./course-academics";

const pathways = [
  { slug: "nda", title: "NDA Preparation" },
  { slug: "cds", title: "CDS Preparation" },
  { slug: "ssb", title: "SSB Preparation" },
];

// These identities already appear in the sample course content. Replace with
// approved profiles and portraits before representing them as actual faculty.
export const faculty = pathways.flatMap(course =>
  courseAcademics[course.slug].teachers.map(teacher => ({
    ...teacher,
    slug: teacher.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    image: `/images/faculty/${teacher.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.webp`,
    initials: teacher.name.split(" ").map(part => part[0]).join(""),
    sample: true,
    courses: [course],
    introduction: `Explore ${teacher.name}’s sample ${teacher.role.toLowerCase()} profile for ${course.title}. The teaching focus covers ${teacher.subjects.join(" and ").toLowerCase()}.`,
    approach: [
      { title: "Build the foundations", description: `Break ${teacher.subjects[0].toLowerCase()} into manageable topics and establish a clear starting point.` },
      { title: "Practise with purpose", description: `Connect learning to ${teacher.subjects[teacher.subjects.length - 1].toLowerCase()} through focused preparation activities.` },
      { title: "Review and improve", description: "Reflect on practice, identify questions and set clear priorities for the next stage of preparation." },
    ],
  }))
);

export function getFaculty(slug) {
  return faculty.find(member => member.slug === slug);
}
