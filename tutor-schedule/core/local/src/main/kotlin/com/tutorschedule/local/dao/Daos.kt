package com.tutorschedule.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.tutorschedule.local.entity.LessonEntity
import com.tutorschedule.local.entity.StudentEntity
import com.tutorschedule.local.entity.TeacherEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LessonDao {
    @Query("SELECT * FROM lessons WHERE start_time >= :start AND start_time <= :end ORDER BY start_time")
    suspend fun getLessonsBetween(start: Long, end: Long): List<LessonEntity>

    @Query("SELECT * FROM lessons WHERE id = :id LIMIT 1")
    suspend fun getLessonById(id: String): LessonEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLesson(entity: LessonEntity)

    @Update
    suspend fun updateLesson(entity: LessonEntity)

    @Query("DELETE FROM lessons WHERE id = :id")
    suspend fun deleteLesson(id: String)

    @Query("DELETE FROM lessons")
    suspend fun deleteAllLessons()

    @Query("SELECT * FROM lessons WHERE start_time >= :start AND start_time <= :end ORDER BY start_time")
    fun observeLessonsBetween(start: Long, end: Long): Flow<List<LessonEntity>>

    @Query("SELECT * FROM lessons WHERE sync_status = 'PENDING' OR sync_status = 'CONFLICT'")
    suspend fun getPendingSyncLessons(): List<LessonEntity>

    @Query("UPDATE lessons SET sync_status = 'SYNCED', updated_at = :remoteUpdatedAt WHERE id = :id")
    suspend fun markAsSynced(id: String, remoteUpdatedAt: Long)

    @Query("SELECT * FROM lessons WHERE student_id = :studentId ORDER BY start_time DESC")
    suspend fun getLessonsByStudent(studentId: String): List<LessonEntity>

    @Query("SELECT * FROM lessons WHERE teacher_id = :teacherId ORDER BY start_time DESC")
    suspend fun getLessonsByTeacher(teacherId: String): List<LessonEntity>
}

@Dao
interface StudentDao {
    @Query("SELECT * FROM students ORDER BY name")
    suspend fun getAll(): List<StudentEntity>

    @Query("SELECT * FROM students WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): StudentEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: StudentEntity)

    @Update
    suspend fun update(entity: StudentEntity)

    @Query("DELETE FROM students WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT * FROM students ORDER BY name")
    fun observeAll(): Flow<List<StudentEntity>>
}

@Dao
interface TeacherDao {
    @Query("SELECT * FROM teachers ORDER BY name")
    suspend fun getAll(): List<TeacherEntity>

    @Query("SELECT * FROM teachers WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): TeacherEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: TeacherEntity)

    @Query("SELECT * FROM teachers ORDER BY name")
    fun observeAll(): Flow<List<TeacherEntity>>
}
