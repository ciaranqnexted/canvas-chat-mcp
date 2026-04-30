export type MessageRole = 'user' | 'assistant'
export type ChatMode = 'local' | 'canvas' | 'auto'
export type MessageSource =
  | 'local_documents'
  | 'canvas_mcp'
  | 'canvas'
  | 'fallback'
  | 'out_of_scope'
  | 'escalation'
  | 'auth_required'
export type ChatIntent =
  | 'lookup_profile'
  | 'verify_otp'
  | 'view_profile'
  | 'see_courses'
  | 'see_enrolments'
  | 'view_assignments'
  | 'view_deadlines'
  | 'view_grades'
  | 'view_exam_results'
  | 'view_announcements'
  | 'get_support'

export interface ChatAction {
  id: Exclude<ChatIntent, 'lookup_profile' | 'verify_otp'>
  label: string
  disabled?: boolean
  reason?: string
}

export interface CanvasUserProfile {
  user_id?: string | number
  id?: string | number
  name?: string
  email?: string
  status?: string
  enrolments: Array<{
    course_id?: string | number
    id?: string | number
    course_name?: string
    name?: string
    status?: string
    workflow_state?: string
  }>
  completed_modules: Array<{
    module_id?: string | number
    id?: string | number
    module_name?: string
    name?: string
    course_id?: string | number
    course_name?: string
    completed_at?: string | null
    exam_result_available?: boolean
    result?: string | number
    score?: string | number
    grade?: string | number
  }>
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  source?: MessageSource
  actions?: ChatAction[]
  profile?: CanvasUserProfile
}

export interface ChatSession {
  sessionId: string
  messages: Message[]
  isLoading: boolean
}

export interface SendMessageRequest {
  session_id: string
  message: string
  mode?: ChatMode
  intent?: ChatIntent
}

export interface SendMessageResponse {
  session_id: string
  reply: string
  source: MessageSource
  iteration_count: number
  actions?: ChatAction[]
  profile?: CanvasUserProfile
  citations?: Array<{
    title: string
    path: string
    snippet: string
  }>
}
