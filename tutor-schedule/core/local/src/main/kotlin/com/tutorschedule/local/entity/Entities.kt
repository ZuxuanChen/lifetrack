package com.tutorschedule.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room 课程实体 — 仅在 :core:local 模块可见
 */
@Entity(
    tableName = "lessons",
    indices = [
        Index(value = ["start_time", "end_time"], name = "idx_lesson_time_range"),
        Index(value = ["student_id"], name = "idx_lesson_student"),
        Index(value = ["teacher_id"], name = "idx_lesson_teacher")
    ]
)
data class LessonEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "student_id")
    val studentId: String,

    @ColumnInfo(name = "teacher_id")
    val teacherId: String,

    @ColumnInfo(name = "subject_code")
    val subjectCode: String,

    @ColumnInfo(name = "start_time")
    val startTime: Long,  // epoch millis

    @ColumnInfo(name = "end_time")
    val endTime: Long,

    @ColumnInfo(name = "recurrence_json")
    val recurrenceJson: String?,

    @ColumnInfo(name = "room_id")
    val roomId: String?,

    @ColumnInfo(name = "status_code")
    val statusCode: String,

    @ColumnInfo(name = "created_at")
    val createdAt: Long,

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long
)

@Entity(
    tableName = "students",
    indices = [
        Index(value = ["name"], name = "idx_student_name")
    ]
)
data class StudentEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "grade_code")
    val gradeCode: String,

    @ColumnInfo(name = "enrolled_subjects_json")
    val enrolledSubjectsJson: String,

    @ColumnInfo(name = "parent_name")
    val parentName: String?,

    @ColumnInfo(name = "parent_phone")
    val parentPhone: String?,

    @ColumnInfo(name = "remaining_hours_json")
    val remainingHoursJson: String,

    @ColumnInfo(name = "notes")
    val notes: String?,

    @ColumnInfo(name = "created_at")
    val createdAt: Long,

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long
)

@Entity(
    tableName = "teachers",
    indices = [
        Index(value = ["name"], name = "idx_teacher_name")
    ]
)
data class TeacherEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "subject_codes_json")
    val subjectCodesJson: String,

    @ColumnInfo(name = "availability_json")
    val availabilityJson: String,

    @ColumnInfo(name = "max_daily_lessons")
    val maxDailyLessons: Int,

    @ColumnInfo(name = "ui_color_argb")
    val uiColorArgb: Int,

    @ColumnInfo(name = "notes")
    val notes: String?
)
