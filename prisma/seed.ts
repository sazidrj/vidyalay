import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create platform super admin (schoolId=1 is a placeholder — superadmin doesn't belong to a school)
  // We use a sentinel school with id=1 which is the first school created
  // Super admin uses schoolId of first school just to satisfy the FK, but middleware keeps them on /superadmin
  const superAdminPassword = await bcrypt.hash("superadmin@123", 12)

  // Create a platform "meta" school for super admin FK requirement
  const platformSchool = await prisma.school.upsert({
    where: { slug: "platform" },
    update: {},
    create: {
      name: "Platform Admin",
      slug: "platform",
      isActive: false, // not a real school
      plan: "enterprise",
    },
  })

  await prisma.user.upsert({
    where: { username: "superadmin" },
    update: {},
    create: {
      schoolId: platformSchool.id,
      username: "superadmin",
      fullName: "Platform Super Admin",
      hashedPassword: superAdminPassword,
      role: "SUPER_ADMIN",
    },
  })

  console.log("Super admin created: superadmin / superadmin@123")

  // Create demo school
  const school = await prisma.school.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo High School",
      slug: "demo",
      address: "123 School Street, Education City",
      phone: "9876543210",
      email: "admin@demohighschool.edu",
      currentSession: "2025-26",
      plan: "pro",
    },
  })

  console.log("School created:", school.name)

  // Create admin user
  const adminPassword = await bcrypt.hash("admin@123", 12)
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      schoolId: school.id,
      username: "admin",
      fullName: "School Administrator",
      email: "admin@demohighschool.edu",
      hashedPassword: adminPassword,
      role: "ADMIN",
    },
  })

  console.log("Admin created:", admin.username)

  // Create teacher
  const teacherPassword = await bcrypt.hash("teacher@123", 12)
  const teacher = await prisma.user.upsert({
    where: { username: "teacher1" },
    update: {},
    create: {
      schoolId: school.id,
      username: "teacher1",
      fullName: "Ramesh Kumar",
      email: "ramesh@demohighschool.edu",
      hashedPassword: teacherPassword,
      role: "TEACHER",
      employeeId: "EMP001",
      subjectSpecialty: "Mathematics",
    },
  })

  console.log("Teacher created:", teacher.username)

  // Create class sections
  const classData = [
    { className: "Class 5", section: "A" },
    { className: "Class 5", section: "B" },
    { className: "Class 6", section: "A" },
    { className: "Class 7", section: "A" },
    { className: "Class 8", section: "A" },
  ]

  const classes = await Promise.all(
    classData.map((c) =>
      prisma.classSection.upsert({
        where: { schoolId_className_section: { schoolId: school.id, className: c.className, section: c.section } },
        update: {},
        create: { schoolId: school.id, ...c },
      })
    )
  )

  console.log("Classes created:", classes.length)

  // Create subjects
  const subjectNames = ["Mathematics", "Science", "English", "Hindi", "Social Studies"]
  const subjects = await Promise.all(
    subjectNames.map((name) =>
      prisma.subject.upsert({
        where: { schoolId_name: { schoolId: school.id, name } },
        update: {},
        create: { schoolId: school.id, name },
      })
    )
  )

  console.log("Subjects created:", subjects.length)

  // Create exam types
  const examTypeData = [
    { name: "Unit Test 1", maxMarks: 25, passMarks: 8, weightPct: 25 },
    { name: "Half Yearly", maxMarks: 80, passMarks: 26, weightPct: 40 },
    { name: "Annual Exam", maxMarks: 80, passMarks: 26, weightPct: 35 },
  ]

  const examTypes = await Promise.all(
    examTypeData.map((et) =>
      prisma.examType.upsert({
        where: { schoolId_name: { schoolId: school.id, name: et.name } },
        update: {},
        create: { schoolId: school.id, ...et },
      })
    )
  )

  console.log("Exam types created:", examTypes.length)

  // Create fee types
  const feeTypeData = [
    { name: "Tuition Fee", amount: 2500, isMonthly: true },
    { name: "Annual Fee", amount: 5000, isMonthly: false },
    { name: "Sports Fee", amount: 1000, isMonthly: false },
    { name: "Computer Lab Fee", amount: 500, isMonthly: false },
  ]

  const feeTypes = await Promise.all(
    feeTypeData.map((ft) =>
      prisma.feeType.upsert({
        where: { schoolId_name: { schoolId: school.id, name: ft.name } },
        update: {},
        create: { schoolId: school.id, ...ft },
      })
    )
  )

  console.log("Fee types created:", feeTypes.length)

  // Create sample students
  const class5A = classes.find((c) => c.className === "Class 5" && c.section === "A")!

  const studentData = [
    { fullName: "Aarav Sharma", fatherName: "Rajesh Sharma", phone: "9811234567", rollNumber: 1 },
    { fullName: "Priya Singh", fatherName: "Suresh Singh", phone: "9822345678", rollNumber: 2 },
    { fullName: "Mohammed Ali", fatherName: "Ibrahim Ali", phone: "9833456789", rollNumber: 3 },
    { fullName: "Sneha Patel", fatherName: "Kiran Patel", phone: "9844567890", rollNumber: 4 },
    { fullName: "Rohit Verma", fatherName: "Ashok Verma", phone: "9855678901", rollNumber: 5 },
  ]

  for (let i = 0; i < studentData.length; i++) {
    const uid = `DEMO-2025-00${i + 1}`
    await prisma.student.upsert({
      where: { studentUid: uid },
      update: {},
      create: {
        schoolId: school.id,
        studentUid: uid,
        classSectionId: class5A.id,
        admissionDate: new Date("2025-04-01"),
        gender: "MALE",
        ...studentData[i],
      },
    })
  }

  console.log("Students created:", studentData.length)

  // Add calendar events
  const calendarData = [
    { title: "Independence Day", startDate: "2025-08-15", endDate: "2025-08-15", eventType: "HOLIDAY" as const },
    { title: "Gandhi Jayanti", startDate: "2025-10-02", endDate: "2025-10-02", eventType: "HOLIDAY" as const },
    { title: "Diwali Holidays", startDate: "2025-10-20", endDate: "2025-10-24", eventType: "HOLIDAY" as const },
    { title: "Half Yearly Exams", startDate: "2025-10-01", endDate: "2025-10-10", eventType: "EXAM" as const },
    { title: "Annual Sports Day", startDate: "2025-12-15", endDate: "2025-12-15", eventType: "SPORTS" as const },
  ]

  for (const event of calendarData) {
    await prisma.calendarEvent.create({
      data: {
        schoolId: school.id,
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
      },
    })
  }

  console.log("Calendar events created:", calendarData.length)

  console.log("\n✅ Seed complete!")
  console.log("\nLogin credentials:")
  console.log("  School ID: demo")
  console.log("  Admin     → username: admin     | password: admin@123")
  console.log("  Teacher   → username: teacher1  | password: teacher@123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
