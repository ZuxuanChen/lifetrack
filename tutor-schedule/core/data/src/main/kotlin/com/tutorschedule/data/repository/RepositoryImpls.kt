package com.tutorschedule.data.repository

import com.tutorschedule.common.LessonId
import com.tutorschedule.common.StudentId
import com.tutorschedule.common.TeacherId
import com.tutorschedule.common.TutorException
import com.tutorschedule.common.TutorResult
import com.tutorschedule.common.WeekRange
import com.tutorschedule.data.datasource.LessonLocalDataSource
import com.tutorschedule.data.datasource.LessonRemoteDataSource
import com.tutorschedule.data.datasource.StudentLocalDataSource
import com.tutorschedule.data.datasource.StudentRemoteDataSource
import com.tutorschedule.data.datasource.TeacherLocalDataSource
import com.tutorschedule.data.datasource.TeacherRemoteDataSource
import com.tutorschedule.data.datasource.SyncChangesResult
import com.tutorschedule.data.mapper.LessonMapper
import com.tutorschedule.data.mapper.StudentMapper
import com.tutorschedule.data.mapper.TeacherMapper
import com.tutorschedule.domain.model.Lesson
import com.tutorschedule.domain.model.Student
import com.tutorschedule.domain.model.Teacher
import com.tutorschedule.domain.repository.LessonRepository
import com.tutorschedule.domain.repository.StudentRepository
import com.tutorschedule.domain.repository.TeacherRepository
import com.tutorschedule.domain.repository.ConflictChecker
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 课程仓储实现 — 本地优先策略 + 后台同步
 */
@Singleton
class LessonRepositoryImpl @Inject constructor(
    private val local: LessonLocalDataSource,
    private val remote: LessonRemoteDataSource,
    private val networkMonitor: NetworkMonitor,
    private val syncEngine: SyncEngine
) : LessonRepository {

    override suspend fun getLessonsForWeek(week: WeekRange): TutorResult<List<Lesson>> {
        return try {
            val localData = local.getLessonsBetween(week.start, week.end)
            
            // 后台触发同步（如果有网络）
            if (networkMonitor.isOnline) {
                syncEngine.requestSync(week)
            }
            
            TutorResult.Success(localData.map { LessonMapper.toDomain(it) })
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun getLesson(id: LessonId): TutorResult<Lesson> {
        return try {
            val dataModel = local.getLesson(id.value)
                ?: return TutorResult.Error(TutorException.NotFoundError("课程"))
            TutorResult.Success(LessonMapper.toDomain(dataModel))
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun createLesson(lesson: Lesson): TutorResult<Lesson> {
        return try {
            val dataModel = LessonMapper.toDataModel(lesson)
            local.insertLesson(dataModel)
            
            // 标记待同步，尝试立即推送
            if (networkMonitor.isOnline) {
                try {
                    val remoteModel = remote.createLesson(dataModel)
                    local.markAsSynced(lesson.id.value, remoteModel.updatedAtMillis)
                } catch (_: Exception) {
                    // 远程创建失败，保持 PENDING 状态，由 SyncEngine 稍后重试
                }
            }
            
            TutorResult.Success(lesson)
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun updateLesson(lesson: Lesson): TutorResult<Lesson> {
        return try {
            val dataModel = LessonMapper.toDataModel(lesson)
            local.updateLesson(dataModel)
            
            if (networkMonitor.isOnline) {
                try {
                    remote.updateLesson(lesson.id.value, dataModel)
                } catch (_: Exception) {
                    // 保持 PENDING
                }
            }
            
            TutorResult.Success(lesson)
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun deleteLesson(id: LessonId): TutorResult<Unit> {
        return try {
            local.deleteLesson(id.value)
            
            if (networkMonitor.isOnline) {
                try {
                    remote.deleteLesson(id.value)
                } catch (_: Exception) {
                    // TODO: 标记为待删除，由 SyncEngine 处理
                }
            }
            
            TutorResult.Success(Unit)
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun moveLesson(
        id: LessonId,
        newStart: Instant,
        newEnd: Instant
    ): TutorResult<Lesson> {
        val existing = getLesson(id)
        if (existing is TutorResult.Error) return existing
        
        val lesson = (existing as TutorResult.Success).data
        val movedLesson = lesson.copy(
            scheduleRule = com.tutorschedule.domain.model.ScheduleRule.OneTime(
                start = newStart,
                end = newEnd
            ),
            updatedAt = Instant.fromEpochMilliseconds(kotlinx.datetime.Clock.System.now().toEpochMilliseconds())
        )
        return updateLesson(movedLesson)
    }

    override fun observeLessonsForWeek(week: WeekRange): Flow<List<Lesson>> {
        return local.observeLessonsBetween(week.start, week.end)
            .map { list -> list.map { LessonMapper.toDomain(it) } }
    }

    override suspend fun getLessonsForStudent(studentId: StudentId): TutorResult<List<Lesson>> {
        return try {
            val data = local.getLessonsByStudent(studentId.value)
            TutorResult.Success(data.map { LessonMapper.toDomain(it) })
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun getLessonsForTeacher(teacherId: TeacherId): TutorResult<List<Lesson>> {
        return try {
            val data = local.getLessonsByTeacher(teacherId.value)
            TutorResult.Success(data.map { LessonMapper.toDomain(it) })
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }
}

/**
 * 学生仓储实现
 */
@Singleton
class StudentRepositoryImpl @Inject constructor(
    private val local: StudentLocalDataSource,
    private val remote: StudentRemoteDataSource,
    private val networkMonitor: NetworkMonitor
) : StudentRepository {

    override suspend fun getStudents(): TutorResult<List<Student>> {
        return try {
            val localData = local.getAllStudents()
            
            if (networkMonitor.isOnline && localData.isEmpty()) {
                // 冷启动拉取
                val remoteData = remote.fetchAllStudents()
                remoteData.forEach { local.insertStudent(it) }
                TutorResult.Success(remoteData.map { StudentMapper.toDomain(it) })
            } else {
                TutorResult.Success(localData.map { StudentMapper.toDomain(it) })
            }
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun getStudent(id: StudentId): TutorResult<Student> {
        return try {
            val dataModel = local.getStudent(id.value)
                ?: return TutorResult.Error(TutorException.NotFoundError("学生"))
            TutorResult.Success(StudentMapper.toDomain(dataModel))
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun createStudent(student: Student): TutorResult<Student> {
        return try {
            val dataModel = StudentMapper.toDataModel(student)
            local.insertStudent(dataModel)
            
            if (networkMonitor.isOnline) {
                try { remote.createStudent(dataModel) } catch (_: Exception) { }
            }
            
            TutorResult.Success(student)
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun updateStudent(student: Student): TutorResult<Student> {
        return try {
            val dataModel = StudentMapper.toDataModel(student)
            local.updateStudent(dataModel)
            
            if (networkMonitor.isOnline) {
                try { remote.updateStudent(student.id.value, dataModel) } catch (_: Exception) { }
            }
            
            TutorResult.Success(student)
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun deleteStudent(id: StudentId): TutorResult<Unit> {
        return try {
            local.deleteStudent(id.value)
            
            if (networkMonitor.isOnline) {
                try { remote.deleteStudent(id.value) } catch (_: Exception) { }
            }
            
            TutorResult.Success(Unit)
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override fun observeStudents(): Flow<List<Student>> {
        return local.observeAllStudents()
            .map { list -> list.map { StudentMapper.toDomain(it) } }
    }

    override fun observeRemainingHours(studentId: StudentId): Flow<Map<com.tutorschedule.common.Subject, Float>> {
        return local.observeAllStudents()
            .map { list ->
                list.find { it.id == studentId.value }?.let { student ->
                    try {
                        val map = kotlinx.serialization.json.Json.decodeFromString<Map<String, Float>>(student.remainingHoursJson)
                        map.mapKeys { com.tutorschedule.common.Subject.valueOf(it.key) }
                    } catch (_: Exception) {
                        emptyMap()
                    }
                } ?: emptyMap()
            }
    }
}

/**
 * 教师仓储实现
 */
@Singleton
class TeacherRepositoryImpl @Inject constructor(
    private val local: TeacherLocalDataSource,
    private val remote: TeacherRemoteDataSource,
    private val networkMonitor: NetworkMonitor
) : TeacherRepository {

    override suspend fun getTeachers(): TutorResult<List<Teacher>> {
        return try {
            val localData = local.getAllTeachers()
            
            if (networkMonitor.isOnline && localData.isEmpty()) {
                val remoteData = remote.fetchAllTeachers()
                // Teacher local 只有查询，没有写入（简化处理，实际应有 insert）
                TutorResult.Success(remoteData.map { TeacherMapper.toDomain(it) })
            } else {
                TutorResult.Success(localData.map { TeacherMapper.toDomain(it) })
            }
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override suspend fun getTeacher(id: TeacherId): TutorResult<Teacher> {
        return try {
            val dataModel = local.getTeacher(id.value)
                ?: return TutorResult.Error(TutorException.NotFoundError("教师"))
            TutorResult.Success(TeacherMapper.toDomain(dataModel))
        } catch (e: Exception) {
            TutorResult.Error(TutorException.DatabaseError(e))
        }
    }

    override fun observeTeachers(): Flow<List<Teacher>> {
        return local.observeAllTeachers()
            .map { list -> list.map { TeacherMapper.toDomain(it) } }
    }
}

/**
 * 冲突检测器实现 — 纯业务逻辑，无 IO
 */
@Singleton
class ScheduleConflictChecker @Inject constructor() : ConflictChecker {

    override fun checkConflicts(
        newLesson: Lesson,
        existingLessons: List<Lesson>,
        teachers: List<Teacher>,
        excludeLessonId: LessonId?
    ): List<com.tutorschedule.domain.model.ScheduleConflict> {
        val conflicts = mutableListOf<com.tutorschedule.domain.model.ScheduleConflict>()
        
        val filtered = existingLessons.filter { it.id != excludeLessonId }
        
        val newStart = newLesson.scheduleRule.start.epochSeconds
        val newEnd = newLesson.scheduleRule.end.epochSeconds
        
        filtered.forEach { existing ->
            val exStart = existing.scheduleRule.start.epochSeconds
            val exEnd = existing.scheduleRule.end.epochSeconds
            
            // 时间重叠检测
            if (newStart < exEnd && newEnd > exStart) {
                // 教师冲突
                if (newLesson.teacherId == existing.teacherId) {
                    conflicts.add(
                        com.tutorschedule.domain.model.ScheduleConflict(
                            type = com.tutorschedule.common.ConflictType.TEACHER_OVERLAP,
                            message = "教师 ${newLesson.teacherId} 在 ${formatTime(newStart)}-${formatTime(newEnd)} 已有课程",
                            involvedLessonIds = listOf(existing.id),
                            involvedTeacherId = newLesson.teacherId
                        )
                    )
                }
                
                // 学生冲突
                if (newLesson.studentId == existing.studentId) {
                    conflicts.add(
                        com.tutorschedule.domain.model.ScheduleConflict(
                            type = com.tutorschedule.common.ConflictType.STUDENT_OVERLAP,
                            message = "学生 ${newLesson.studentId} 在该时段已有课程",
                            involvedLessonIds = listOf(existing.id)
                        )
                    )
                }
                
                // 教室冲突
                if (newLesson.roomId != null && newLesson.roomId == existing.roomId) {
                    conflicts.add(
                        com.tutorschedule.domain.model.ScheduleConflict(
                            type = com.tutorschedule.common.ConflictType.ROOM_OVERLAP,
                            message = "教室 ${newLesson.roomId} 已被占用",
                            involvedLessonIds = listOf(existing.id),
                            involvedRoomId = newLesson.roomId
                        )
                    )
                }
            }
        }
        
        // 教师可用性检测 — 使用新课程的时间，而非当前系统时间
        val teacher = teachers.find { it.id == newLesson.teacherId }
        teacher?.let { t ->
            val newLessonLocal = newLesson.scheduleRule.start
                .toLocalDateTime(kotlinx.datetime.TimeZone.currentSystemDefault())
            val dayOfWeek = newLessonLocal.dayOfWeek
            val time = newLessonLocal.time
            
            if (!t.isAvailableAt(dayOfWeek, time)) {
                conflicts.add(
                    com.tutorschedule.domain.model.ScheduleConflict(
                        type = com.tutorschedule.common.ConflictType.TEACHER_REST_DAY,
                        message = "教师 ${t.name} 在该时段不可用",
                        involvedLessonIds = emptyList(),
                        involvedTeacherId = t.id
                    )
                )
            }
        }
        
        return conflicts
    }
    
    private fun formatTime(epochSeconds: Long): String {
        val dt = Instant.fromEpochSeconds(epochSeconds)
            .toLocalDateTime(kotlinx.datetime.TimeZone.currentSystemDefault())
        return "${dt.hour.toString().padStart(2, '0')}:${dt.minute.toString().padStart(2, '0')}"
    }
}

/**
 * 网络状态监控接口（由 App 模块提供实现）
 */
interface NetworkMonitor {
    val isOnline: Boolean
}

/**
 * 同步引擎接口
 */
interface SyncEngine {
    suspend fun requestSync(week: WeekRange)
}
