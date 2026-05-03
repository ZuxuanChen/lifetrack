package com.tutorschedule.local.di

import android.content.Context
import androidx.room.Room
import com.tutorschedule.common.TutorConstants
import com.tutorschedule.data.datasource.LessonLocalDataSource
import com.tutorschedule.data.datasource.StudentLocalDataSource
import com.tutorschedule.data.datasource.TeacherLocalDataSource
import com.tutorschedule.local.database.TutorDatabase
import com.tutorschedule.local.datasource.RoomLessonDataSource
import com.tutorschedule.local.datasource.RoomStudentDataSource
import com.tutorschedule.local.datasource.RoomTeacherDataSource
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class LocalDataSourceModule {

    @Binds
    @Singleton
    abstract fun bindLessonLocalDataSource(impl: RoomLessonDataSource): LessonLocalDataSource

    @Binds
    @Singleton
    abstract fun bindStudentLocalDataSource(impl: RoomStudentDataSource): StudentLocalDataSource

    @Binds
    @Singleton
    abstract fun bindTeacherLocalDataSource(impl: RoomTeacherDataSource): TeacherLocalDataSource

    companion object {
        @Provides
        @Singleton
        fun provideDatabase(@ApplicationContext context: Context): TutorDatabase {
            return Room.databaseBuilder(
                context,
                TutorDatabase::class.java,
                TutorConstants.DATABASE_NAME
            )
                .fallbackToDestructiveMigration() // 开发阶段简化，生产环境应写 Migration
                .build()
        }

        @Provides
        fun provideLessonDao(db: TutorDatabase) = db.lessonDao()

        @Provides
        fun provideStudentDao(db: TutorDatabase) = db.studentDao()

        @Provides
        fun provideTeacherDao(db: TutorDatabase) = db.teacherDao()
    }
}
