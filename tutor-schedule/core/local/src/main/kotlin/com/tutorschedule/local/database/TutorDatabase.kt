package com.tutorschedule.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.tutorschedule.local.dao.LessonDao
import com.tutorschedule.local.dao.StudentDao
import com.tutorschedule.local.dao.TeacherDao
import com.tutorschedule.local.entity.LessonEntity
import com.tutorschedule.local.entity.StudentEntity
import com.tutorschedule.local.entity.TeacherEntity

@Database(
    entities = [
        LessonEntity::class,
        StudentEntity::class,
        TeacherEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class TutorDatabase : RoomDatabase() {
    abstract fun lessonDao(): LessonDao
    abstract fun studentDao(): StudentDao
    abstract fun teacherDao(): TeacherDao
}
