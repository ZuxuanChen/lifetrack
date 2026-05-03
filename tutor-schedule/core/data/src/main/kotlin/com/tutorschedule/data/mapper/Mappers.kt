package com.tutorschedule.data.mapper

import com.tutorschedule.common.GradeLevel
import com.tutorschedule.common.LessonId
import com.tutorschedule.common.LessonStatus
import com.tutorschedule.common.RoomId
import com.tutorschedule.common.StudentId
import com.tutorschedule.common.Subject
import com.tutorschedule.common.TeacherId
import com.tutorschedule.data.model.LessonDataModel
import com.tutorschedule.data.model.StudentDataModel
import com.tutorschedule.data.model.TeacherDataModel
import com.tutorschedule.domain.model.DailyAvailability
import com.tutorschedule.domain.model.Lesson
import com.tutorschedule.domain.model.RecurrencePattern
import com.tutorschedule.domain.model.ScheduleRule
import com.tutorschedule.domain.model.Student
import com.tutorschedule.domain.model.Teacher
import com.tutorschedule.domain.model.TimeRange
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toInstant
import kotlinx.datetime.toLocalDateTime
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Lesson 映射器 — Domain ↔ DataModel 双向转换
 */
internal object LessonMapper {

    private val json = Json { ignoreUnknownKeys = true }

    fun toDomain(dataModel: LessonDataModel): Lesson {
        return Lesson(
            id = LessonId(dataModel.id),
            studentId = StudentId(dataModel.studentId),
            teacherId = TeacherId(dataModel.teacherId),
            subject = Subject.valueOf(dataModel.subjectCode),
            scheduleRule = parseScheduleRule(dataModel),
            roomId = dataModel.roomId?.let { RoomId(it) },
            status = LessonStatus.valueOf(dataModel.statusCode),
            createdAt = Instant.fromEpochMilliseconds(dataModel.createdAtMillis),
            updatedAt = Instant.fromEpochMilliseconds(dataModel.updatedAtMillis)
        )
    }

    fun toDataModel(domain: Lesson): LessonDataModel {
        return LessonDataModel(
            id = domain.id.value,
            studentId = domain.studentId.value,
            teacherId = domain.teacherId.value,
            subjectCode = domain.subject.name,
            startEpochMillis = domain.scheduleRule.start.toEpochMilliseconds(),
            endEpochMillis = domain.scheduleRule.end.toEpochMilliseconds(),
            recurrenceJson = serializeRecurrence(domain.scheduleRule),
            roomId = domain.roomId?.value,
            statusCode = domain.status.name,
            syncStatus = LessonDataModel.SyncStatus.PENDING,
            createdAtMillis = domain.createdAt.toEpochMilliseconds(),
            updatedAtMillis = domain.updatedAt.toEpochMilliseconds()
        )
    }

    private fun parseScheduleRule(dataModel: LessonDataModel): ScheduleRule {
        // 如果有 recurrenceJson，解析为 Recurring
        if (!dataModel.recurrenceJson.isNullOrBlank()) {
            val pattern = parseRecurrenceJson(dataModel.recurrenceJson)
            val startDate = Instant.fromEpochMilliseconds(dataModel.startEpochMillis)
                .toLocalDateTime(TimeZone.currentSystemDefault()).date
            return ScheduleRule.Recurring(
                startDate = startDate,
                recurrence = pattern,
                dailyStartTime = Instant.fromEpochMilliseconds(dataModel.startEpochMillis)
                    .toLocalDateTime(TimeZone.currentSystemDefault()).time,
                dailyEndTime = Instant.fromEpochMilliseconds(dataModel.endEpochMillis)
                    .toLocalDateTime(TimeZone.currentSystemDefault()).time
            )
        }
        return ScheduleRule.OneTime(
            start = Instant.fromEpochMilliseconds(dataModel.startEpochMillis),
            end = Instant.fromEpochMilliseconds(dataModel.endEpochMillis)
        )
    }

    private fun serializeRecurrence(rule: ScheduleRule): String? {
        return if (rule is ScheduleRule.Recurring) {
            json.encodeToString(rule.recurrence)
        } else null
    }

    private fun parseRecurrenceJson(jsonStr: String): RecurrencePattern {
        val obj = json.parseToJsonElement(jsonStr).jsonObject
        return RecurrencePattern(
            frequency = com.tutorschedule.domain.model.Frequency.valueOf(
                obj["frequency"]?.jsonPrimitive?.content ?: "WEEKLY"
            ),
            interval = obj["interval"]?.jsonPrimitive?.content?.toIntOrNull() ?: 1,
            daysOfWeek = emptySet(), // 简化处理，实际应解析完整
            exceptionDates = emptySet()
        )
    }
}

/**
 * Student 映射器
 */
internal object StudentMapper {

    private val json = Json { ignoreUnknownKeys = true }

    fun toDomain(dataModel: StudentDataModel): Student {
        val hoursMap: Map<Subject, Float> = try {
            val map = json.decodeFromString<Map<String, Float>>(dataModel.remainingHoursJson)
            map.mapKeys { Subject.valueOf(it.key) }
        } catch (_: Exception) {
            emptyMap()
        }

        return Student(
            id = StudentId(dataModel.id),
            name = dataModel.name,
            grade = GradeLevel.valueOf(dataModel.gradeCode),
            enrolledSubjects = dataModel.enrolledSubjectCodes.map { Subject.valueOf(it) },
            parentName = dataModel.parentName,
            parentPhone = dataModel.parentPhone,
            remainingHours = hoursMap,
            notes = dataModel.notes,
            createdAt = Instant.fromEpochMilliseconds(dataModel.createdAtMillis),
            updatedAt = Instant.fromEpochMilliseconds(dataModel.updatedAtMillis)
        )
    }

    fun toDataModel(domain: Student): StudentDataModel {
        val hoursJson = json.encodeToString(
            domain.remainingHours.mapKeys { it.key.name }
        )
        return StudentDataModel(
            id = domain.id.value,
            name = domain.name,
            gradeCode = domain.grade.name,
            enrolledSubjectCodes = domain.enrolledSubjects.map { it.name },
            parentName = domain.parentName,
            parentPhone = domain.parentPhone,
            remainingHoursJson = hoursJson,
            notes = domain.notes,
            createdAtMillis = domain.createdAt.toEpochMilliseconds(),
            updatedAtMillis = domain.updatedAt.toEpochMilliseconds()
        )
    }
}

/**
 * Teacher 映射器
 */
internal object TeacherMapper {

    private val json = Json { ignoreUnknownKeys = true }

    fun toDomain(dataModel: TeacherDataModel): Teacher {
        return Teacher(
            id = TeacherId(dataModel.id),
            name = dataModel.name,
            subjects = dataModel.subjectCodes.map { Subject.valueOf(it) },
            weeklyAvailability = try {
                json.decodeFromString<List<DailyAvailability>>(dataModel.availabilityJson)
            } catch (_: Exception) {
                emptyList()
            },
            maxDailyLessons = dataModel.maxDailyLessons,
            uiColorArgb = dataModel.uiColorArgb,
            notes = dataModel.notes
        )
    }

    fun toDataModel(domain: Teacher): TeacherDataModel {
        return TeacherDataModel(
            id = domain.id.value,
            name = domain.name,
            subjectCodes = domain.subjects.map { it.name },
            availabilityJson = json.encodeToString(domain.weeklyAvailability),
            maxDailyLessons = domain.maxDailyLessons,
            uiColorArgb = domain.uiColorArgb,
            notes = domain.notes
        )
    }
}
