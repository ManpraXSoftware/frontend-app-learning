import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { breakpoints, useWindowSize, DataTable, Button } from '@openedx/paragon';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';

import CertificateStatus from './certificate-status/CertificateStatus';
import CourseCompletion from './course-completion/CourseCompletion';
import CourseGrade from './grades/course-grade/CourseGrade';
import DetailedGrades from './grades/detailed-grades/DetailedGrades';
import GradeSummary from './grades/grade-summary/GradeSummary';
import ProgressHeader from './ProgressHeader';
import RelatedLinks from './related-links/RelatedLinks';

import { useModel } from '../../generic/model-store';

const ProgressTab = () => {
  const {
    courseId,
  } = useSelector(state => state.courseHome);

  const {
    gradesFeatureIsFullyLocked, disableProgressGraph,
  } = useModel('progress', courseId);

  const applyLockedOverlay = gradesFeatureIsFullyLocked ? 'locked-overlay' : '';

  const [programProgressList, setProgramProgressList] = useState([]);
  const [showAllCourses, setShowAllCourses] = useState(false);

  useEffect(() => {
    if (!courseId) { return; }
    getAuthenticatedHttpClient()
      .get(`${getConfig().LMS_BASE_URL}/explore-courses/v1/program-course-progress/?course_id=${courseId}`)
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          setProgramProgressList(data);
        }
      })
      .catch(() => {});
  }, [courseId]);

  const windowWidth = useWindowSize().width;
  if (windowWidth === undefined) {
    // Bail because we don't want to load <CertificateStatus/> twice, emitting 'visited' events both times.
    // This is a hacky solution, since the user can resize the screen and still get two visited events.
    // But I'm leaving a larger refactor as an exercise to a future reader.
    return null;
  }

  const wideScreen = windowWidth >= breakpoints.large.minWidth;
  return (
    <>
      <ProgressHeader />
      <div className="row w-100 m-0">
        {/* Main body */}
        <div className="col-12 col-md-8 p-0">
          {!disableProgressGraph && <CourseCompletion />}
          {!wideScreen && <CertificateStatus />}
          <CourseGrade />
          <div className={`grades my-4 p-4 rounded raised-card ${applyLockedOverlay}`} aria-hidden={gradesFeatureIsFullyLocked}>
            <GradeSummary />
            <DetailedGrades />
          </div>
        </div>

        {/* Side panel */}
        <div className="col-12 col-md-4 p-0 px-md-4 mx-prog-side-panel" id="mx-prog-side-panel">
          {/* Manprax  */}
          {programProgressList.map(({ program_uuid, progress_threshold, courses }) => {
            const isCourseComplete = course => (
              course.mode === 'certificate'
                ? !!course.certificate_status
                : course.progress >= progress_threshold
            );
            // Certificate-tracked courses cluster first; progress-tracked courses follow, sorted desc.
            const sortGroup = group => [
              ...group.filter(c => c.mode === 'certificate'),
              ...group.filter(c => c.mode !== 'certificate').sort((a, b) => b.progress - a.progress),
            ];
            const complete = sortGroup(courses.filter(isCourseComplete));
            const incomplete = sortGroup(courses.filter(c => !isCourseComplete(c)));
            // Show All: complete → incomplete so incomplete sit in the middle visually
            // Show Only Incomplete: just incomplete
            const visibleCourses = showAllCourses
              ? [...complete, ...incomplete]
              : incomplete;
            return (
              <div key={program_uuid} className="mb-4 p-3 rounded mx-raised-card">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h5 className="prg-progress-title mb-0">Program Progress</h5>
                  <Button
                    variant="outline-primary"
                    className="btn btn-outline-primary btn-sm mx-btn-toggle"
                    size="sm"
                    onClick={() => setShowAllCourses(prev => !prev)}
                    aria-pressed={showAllCourses}
                    aria-label={showAllCourses ? 'Show only incomplete courses' : 'Show all courses'}
                  >
                    {showAllCourses ? 'Show Only Incomplete' : 'Show All'}
                  </Button>
                </div>
                <p className="small text-muted mb-2 mt-2">{`Required completion: ${progress_threshold}%`}</p>
                <DataTable
                  data={visibleCourses.map(({
                    title, progress, mode, certificate_status: certificateStatus,
                  }) => ({
                    title,
                    progress: mode === 'certificate' ? (certificateStatus ? 'Y' : 'N') : `${progress}%`,
                  }))}
                  itemCount={visibleCourses.length}
                  columns={[
                    { Header: 'Course', accessor: 'title' },
                    { Header: 'Progress/Certificate', accessor: 'progress', headerClassName: 'justify-content-end', cellClassName: 'text-right' },
                  ]}
                >
                  <DataTable.Table />
                  {visibleCourses.length === 0 && (
                    <p className="text-center text-muted py-3 mb-0">No course found</p>
                  )}
                </DataTable>
              </div>
            );
          })}
          {wideScreen && <CertificateStatus />}
          <RelatedLinks />
        </div>
      </div>
    </>
  );
};

export default ProgressTab;
