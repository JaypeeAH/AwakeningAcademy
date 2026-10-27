import { pythagorasSample } from './pythagoras'
import { cellsSample } from './cells'
import { solarSystemSample } from './solarSystem'
import { ancientEgyptSample } from './ancientEgypt'
import type { SampleCourseDefinition } from '@/@types/courses/SampleCourse'

/**
 * Sample courses teachers can add from the Courses page. Lesson pictures are openly licensed (Wikimedia
 * Commons / NASA) and credited in their captions; videos are YouTube links shown click-to-play.
 */
export const SAMPLE_COURSES: SampleCourseDefinition[] = [
    pythagorasSample,
    cellsSample,
    solarSystemSample,
    ancientEgyptSample,
]

export const findSampleCourse = (id: string) => SAMPLE_COURSES.find((s) => s.id === id) ?? null
