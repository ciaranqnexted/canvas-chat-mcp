export interface StudentHubConfig {
  courseId: string
  accountId: string
  accountName: string
  name: string
  canvasUrl: string
}

const DEFAULT_COURSE_ID = '5704'
const DEFAULT_ACCOUNT_ID = '1'
const DEFAULT_ACCOUNT_NAME = 'Technology & Design (T&D)'
const DEFAULT_HUB_NAME = 'AIT Student Hub'
const DEFAULT_CANVAS_URL = 'https://ait.instructure.com/courses/5704'

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

export function getStudentHubConfig(): StudentHubConfig {
  const courseId = optionalEnv('NEXI_STUDENT_HUB_COURSE_ID') ?? DEFAULT_COURSE_ID

  return {
    courseId,
    accountId: optionalEnv('NEXI_STUDENT_HUB_ACCOUNT_ID') ?? DEFAULT_ACCOUNT_ID,
    accountName: optionalEnv('NEXI_STUDENT_HUB_ACCOUNT_NAME') ?? DEFAULT_ACCOUNT_NAME,
    name: optionalEnv('NEXI_STUDENT_HUB_NAME') ?? DEFAULT_HUB_NAME,
    canvasUrl:
      optionalEnv('NEXI_STUDENT_HUB_CANVAS_URL') ??
      (courseId === DEFAULT_COURSE_ID
        ? DEFAULT_CANVAS_URL
        : `https://ait.instructure.com/courses/${courseId}`),
  }
}
