package com.tutorschedule.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * 统一 API 响应包装 — 所有接口返回此结构
 */
@Serializable
data class ApiResponse<T>(
    @SerialName("code")
    val code: Int,
    @SerialName("message")
    val message: String?,
    @SerialName("data")
    val data: T,
    @SerialName("timestamp")
    val timestamp: Long
)

@Serializable
data class LessonDto(
    @SerialName("id")
    val id: String,
    @SerialName("student_id")
    val studentId: String,
    @SerialName("teacher_id")
    val teacherId: String,
    @SerialName("subject_code")
    val subjectCode: String,
    @SerialName("start_time")
    val startTime: String,  // ISO-8601
    @SerialName("end_time")
    val endTime: String,
    @SerialName("recurrence_json")
    val recurrenceJson: String?,
    @SerialName("room_id")
    val roomId: String?,
    @SerialName("status_code")
    val statusCode: String,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("updated_at")
    val updatedAt: String
)

@Serializable
data class CreateLessonRequest(
    @SerialName("student_id")
    val studentId: String,
    @SerialName("teacher_id")
    val teacherId: String,
    @SerialName("subject_code")
    val subjectCode: String,
    @SerialName("start_time")
    val startTime: String,
    @SerialName("end_time")
    val endTime: String,
    @SerialName("recurrence_json")
    val recurrenceJson: String?,
    @SerialName("room_id")
    val roomId: String?
)

@Serializable
data class UpdateLessonRequest(
    @SerialName("student_id")
    val studentId: String,
    @SerialName("teacher_id")
    val teacherId: String,
    @SerialName("subject_code")
    val subjectCode: String,
    @SerialName("start_time")
    val startTime: String,
    @SerialName("end_time")
    val endTime: String,
    @SerialName("recurrence_json")
    val recurrenceJson: String?,
    @SerialName("room_id")
    val roomId: String?,
    @SerialName("status_code")
    val statusCode: String
)

@Serializable
data class StudentDto(
    @SerialName("id")
    val id: String,
    @SerialName("name")
    val name: String,
    @SerialName("grade_code")
    val gradeCode: String,
    @SerialName("enrolled_subjects")
    val enrolledSubjects: List<String>,
    @SerialName("parent_name")
    val parentName: String?,
    @SerialName("parent_phone")
    val parentPhone: String?,
    @SerialName("remaining_hours")
    val remainingHours: Map<String, Float>,
    @SerialName("notes")
    val notes: String?,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("updated_at")
    val updatedAt: String
)

@Serializable
data class TeacherDto(
    @SerialName("id")
    val id: String,
    @SerialName("name")
    val name: String,
    @SerialName("subject_codes")
    val subjectCodes: List<String>,
    @SerialName("availability_json")
    val availabilityJson: String,
    @SerialName("max_daily_lessons")
    val maxDailyLessons: Int,
    @SerialName("ui_color_argb")
    val uiColorArgb: Int,
    @SerialName("notes")
    val notes: String?
)

@Serializable
data class SyncChangesDto(
    @SerialName("lessons_created")
    val lessonsCreated: List<LessonDto>,
    @SerialName("lessons_updated")
    val lessonsUpdated: List<LessonDto>,
    @SerialName("lessons_deleted")
    val lessonsDeleted: List<String>,
    @SerialName("server_timestamp")
    val serverTimestamp: Long
)

@Serializable
data class ConflictDto(
    @SerialName("type")
    val type: String,
    @SerialName("message")
    val message: String,
    @SerialName("related_lesson_ids")
    val relatedLessonIds: List<String>
)
