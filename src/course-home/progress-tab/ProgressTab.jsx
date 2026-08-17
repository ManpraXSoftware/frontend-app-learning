import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
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

const ProgressTab = ({ bare }) => {
  const {
    courseId,
  } = useSelector(state => state.courseHome);

  const {
    gradesFeatureIsFullyLocked, disableProgressGraph, certificateData, programCertificateData,
  } = useModel('progress', courseId);

  const applyLockedOverlay = gradesFeatureIsFullyLocked ? 'locked-overlay' : '';

  // Manprax: once a certificate has been generated, show the certificate card before Program Progress
  const hasCertificate = certificateData?.certStatus === 'downloadable' || !!programCertificateData?.certificateUrl;

  const [programProgressList, setProgramProgressList] = useState([]);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [toggleAnnouncement, setToggleAnnouncement] = useState('');

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
      <ProgressHeader bare={bare} />
      <div className="row w-100 m-0">
        {/* Main body */}
        <div className="col-12 col-md-8 p-0">
          {!disableProgressGraph && <CourseCompletion />}
          {!wideScreen && <CertificateStatus />}
          <CourseGrade />
          {!bare && (
            <div className={`grades my-4 p-4 rounded raised-card ${applyLockedOverlay}`} aria-hidden={gradesFeatureIsFullyLocked}>
              <GradeSummary />
              <DetailedGrades />
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="col-12 col-md-4 p-0 px-md-4 mx-prog-side-panel" id="mx-prog-side-panel">
          {/* Manprax  */}
          {wideScreen && hasCertificate && <CertificateStatus />}
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
            const toggleDescId = `program-progress-toggle-desc-${program_uuid}`;
            return (
              <div key={program_uuid} className="mb-4 p-3 rounded mx-raised-card">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h5 className="prg-progress-title mb-0 mx-focusable-text" tabIndex="0">
                    Program Progress
                  </h5>
                  <Button
                    variant="outline-primary"
                    className="btn btn-outline-primary btn-sm mx-btn-toggle"
                    size="sm"
                    onClick={() => {
                      const nextShowAllCourses = !showAllCourses;
                      setShowAllCourses(nextShowAllCourses);
                      setToggleAnnouncement(nextShowAllCourses ? 'Showing all courses.' : 'Showing only incomplete courses.');
                    }}
                    aria-label={showAllCourses ? 'Show Only Incomplete Courses' : 'Show All Courses'}
                    aria-describedby={toggleDescId}
                  >
                    {showAllCourses ? 'Show Only Incomplete' : 'Show All'}
                  </Button>
                </div>
                <div aria-live="polite" className="sr-only">{toggleAnnouncement}</div>
                <span id={toggleDescId} className="sr-only">
                  {showAllCourses
                    ? 'Activating this button will display only incomplete courses. Currently Showing all courses.'
                    : 'Activating this button will display all courses. Currently, Showing only incomplete courses.'}
                </span>
                <p className="small text-muted mb-2 mt-2 mx-focusable-text" tabIndex="0">
                  {`Required completion: ${progress_threshold}%`}
                </p>
                <div className="mx-program-progress-scroll" tabIndex="0">
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
                      <p className="text-center py-3 mb-0 mx-dark-black" tabIndex="0">No course found</p>
                    )}
                  </DataTable>
                </div>
              </div>
            );
          })}
          {wideScreen && !hasCertificate && <CertificateStatus />}
          {!bare && <RelatedLinks />}
        </div>
      </div>
    </>
  );
};

ProgressTab.propTypes = {
  bare: PropTypes.bool,
};

ProgressTab.defaultProps = {
  bare: false,
};

export default ProgressTab;
