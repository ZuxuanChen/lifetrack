package com.tutorschedule.data.model

/**
 * 数据层内部模型 — 存储无关的中间表示
 *
 * 位于 :core:data 模块，作为 Local DataSource 与 RepositoryImpl 之间的通用语言。
 * 不暴露给 Domain 层（Domain 使用 [com.tutorschedule.domain.model.Lesson]），
 * 也不暴露给 Local 层（它们使用 Entity）。
 */

data class LessonDataModel(
    val id: String,
    val studentId: String,
    val teacherId: String,
    val subjectCode: String,        // Subject enum name, e.g. "MATH"
    val startEpochMillis: Long,
    val endEpochMillis: Long,
    val recurrenceJson: String?,    // JSON serialized RecurrencePattern
    val roomId: String?,
    val statusCode: String,         // LessonStatus enum name
    val createdAtMillis: Long,
    val updatedAtMillis: Long
)

data class StudentDataModel(
    val id: String,
    val name: String,
    val gradeCode: String,          // GradeLevel enum name
    val enrolledSubjectCodes: List<String>,
    val parentName: String?,
    val parentPhone: String?,
    val remainingHoursJson: String, // {"MATH": 20.0, "ENGLISH": 15.5}
    val notes: String?,
    val createdAtMillis: Long,
    val updatedAtMillis: Long
)

data class TeacherDataModel(
    val id: String,
    val name: String,
    val subjectCodes: List<String>,
    val availabilityJson: String,   // JSON serialized WeeklyAvailability
    val maxDailyLessons: Int,
    val uiColorArgb: Int,
    val notes: String?
)
