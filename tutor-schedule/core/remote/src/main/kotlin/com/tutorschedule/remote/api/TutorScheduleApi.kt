package com.tutorschedule.remote.api

import com.tutorschedule.remote.dto.ApiResponse
import com.tutorschedule.remote.dto.ConflictDto
import com.tutorschedule.remote.dto.CreateLessonRequest
import com.tutorschedule.remote.dto.LessonDto
import com.tutorschedule.remote.dto.StudentDto
import com.tutorschedule.remote.dto.SyncChangesDto
import com.tutorschedule.remote.dto.TeacherDto
import com.tutorschedule.remote.dto.UpdateLessonRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface TutorScheduleApi {

    @GET("lessons/week")
    suspend fun getLessonsForWeek(
        @Query("start_date") startDate: String,
        @Query("end_date") endDate: String
    ): Response<ApiResponse<List<LessonDto>>>

    @POST("lessons")
    suspend fun createLesson(
        @Body request: CreateLessonRequest
    ): Response<ApiResponse<LessonDto>>

    @PATCH("lessons/{id}")
    suspend fun updateLesson(
        @Path("id") id: String,
        @Body request: UpdateLessonRequest
    ): Response<ApiResponse<LessonDto>>

    @DELETE("lessons/{id}")
    suspend fun deleteLesson(
        @Path("id") id: String
    ): Response<ApiResponse<Unit>>

    @GET("students")
    suspend fun getStudents(): Response<ApiResponse<List<StudentDto>>>

    @GET("teachers")
    suspend fun getTeachers(): Response<ApiResponse<List<TeacherDto>>>

    @GET("sync/changes")
    suspend fun getChangesSince(
        @Query("last_sync") lastSyncTimestamp: Long
    ): Response<ApiResponse<SyncChangesDto>>
}
