import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  ButtonGroup,
  Button,
  Badge,
  Col,
  Row,
  Nav,
  NavItem,
  NavLink,
  Container,
  TabContent,
  TabPane,
  Spinner,
} from "reactstrap";

import { GoBackButton, Loader } from "@certego/certego-ui";

import { useNavigate, useLocation } from "react-router-dom";
import {
  AnalyzersReportTable,
  ConnectorsReportTable,
  PivotsReportTable,
  VisualizersReportTable,
} from "./tables";
import {
  reportedPluginNumber,
  reportedVisualizerNumber,
  JobInfoCard,
  JobIsRunningAlert,
  JobActionsBar,
} from "./sections";
import { StatusIcon } from "../../../common";
import VisualizerReport from "../visualizer/visualizer";
import {
  jobFinalStatuses,
  pluginStatuses,
  jobResultSection,
} from "../../../../constants/constants";

/* THESE IDS CANNOT BE EMPTY!
We perform a redirect in case the user landed in the visualzier page without a visualizer,
this is case happens because we don't know the available visualizers before enter in the job page:
ex: when we start a job from start scan we cannot know the visualizer pages.
When we land in the job page without a visualizer selected we need to redirect the user to a valid visualizer,
the redirect is based on the url: in case the parmam miss it means the page is not selected and we need to redirect
in case we use empty param for this page we fall in an infinite redirect loop.
*/
const LOADING_VISUALIZER_UI_ELEMENT_CODE = "loading";
const NO_VISUALIZER_UI_ELEMENT_CODE = "no-visualizer";

export default function JobOverview({
  isRunningJob,
  job,
  refetch,
  section,
  subSection,
}) {
  console.debug("JobOverview rendered");
  console.debug(`section: ${section}, subSection: ${subSection}`);

  const isSelectedUI = section === jobResultSection.VISUALIZER;

  const rawElements = React.useMemo(
    () => [
      {
        id: "analyzer",
        nav: (
          <div className="d-flex-center">
            <strong>Analyzers Report</strong>
            <Badge className="ms-2">
              {reportedPluginNumber(job.analyzer_reports)} /&nbsp;
              {job.analyzers_to_execute.length}
            </Badge>
          </div>
        ),
        report: <AnalyzersReportTable job={job} refetch={refetch} />,
      },
      {
        id: "connector",
        nav: (
          <div className="d-flex-center">
            <strong>Connectors Report</strong>
            <Badge className="ms-2">
              {reportedPluginNumber(job.connector_reports)} /&nbsp;
              {job.connectors_to_execute.length}
            </Badge>
          </div>
        ),
        report: <ConnectorsReportTable job={job} refetch={refetch} />,
      },
      {
        id: "pivot",
        nav: (
          <div className="d-flex-center">
            <strong>Pivots Report</strong>
            <Badge className="ms-2">
              {reportedPluginNumber(job.pivot_reports)} /&nbsp;
              {job.pivots_to_execute.length}
            </Badge>
          </div>
        ),
        report: <PivotsReportTable job={job} refetch={refetch} />,
      },
      {
        id: "visualizer",
        nav: (
          <div className="d-flex-center">
            <strong>Visualizers Report</strong>
            <Badge className="ms-2">
              {reportedVisualizerNumber(
                job.visualizer_reports,
                job.visualizers_to_execute,
              )}{" "}
              /&nbsp;
              {job.visualizers_to_execute.length}
            </Badge>
          </div>
        ),
        report: <VisualizersReportTable job={job} refetch={refetch} />,
      },
    ],
    [job, refetch],
  );

  // state
  const navigate = useNavigate();
  const location = useLocation();
  const [UIElements, setUIElements] = useState([]);

  useEffect(() => {
    // this store the ui elements when the frontend download them
    console.debug("JobOverview - create/update visualizer components");
    console.debug(job);
    let newUIElements = [];

    // 1) generate UI elements in case all visualizers are completed
    if (
      Object.values(jobFinalStatuses).includes(job.status) &&
      job.visualizers_to_execute.length > 0
    ) {
      newUIElements = job.visualizer_reports.map((visualizerReport) => ({
        id: visualizerReport.name,
        nav: (
          <div className="d-flex-center">
            <strong>{visualizerReport.name}</strong>
            {visualizerReport.status !== pluginStatuses.SUCCESS && (
              <StatusIcon className="ms-2" status={visualizerReport.status} />
            )}
          </div>
        ),
        report: <VisualizerReport visualizerReport={visualizerReport} />,
      }));
    }

    // 2) in case visualizers are running put a loader
    if (
      !Object.values(jobFinalStatuses).includes(job.status) &&
      job.visualizers_to_execute.length > 0
    ) {
      newUIElements.push({
        id: LOADING_VISUALIZER_UI_ELEMENT_CODE,
        nav: null,
        report: (
          <div
            className="d-flex justify-content-center"
            id="visualizerLoadingSpinner"
          >
            <Spinner />
          </div>
        ),
      });
    }

    // 3) in case there are no visualizers add a "no data" visualizer
    if (job.visualizers_to_execute.length === 0) {
      newUIElements.push({
        id: NO_VISUALIZER_UI_ELEMENT_CODE,
        nav: null,
        report: (
          <p className="text-center">
            No visualizers available. You can consult the results in the raw
            format.{" "}
          </p>
        ),
      });
    }

    setUIElements(newUIElements);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  useEffect(() => {
    console.debug("JobOverview - check to set default visualizer");
    // check visualizers have been loaded and user didn't changed page
    console.debug(`Ui elements number: ${UIElements.length}`);
    if (UIElements.length !== 0 && !location.state?.userChanged) {
      console.debug("updated visualizers");
      if (!subSection) {
        console.debug(
          `navigate to visualizer: ${
            UIElements[0].id
          }, encoded: ${encodeURIComponent(UIElements[0].id)}`,
        );
        // in case no section is selected (ex: from start scan) redirect to a visualizer
        navigate(
          `/jobs/${job.id}/${jobResultSection.VISUALIZER}/${encodeURIComponent(
            UIElements[0].id,
          )}`,
        );
      } else if (
        subSection === LOADING_VISUALIZER_UI_ELEMENT_CODE &&
        UIElements[0].id !== LOADING_VISUALIZER_UI_ELEMENT_CODE
      ) {
        // in case we are in the loading page and we update the visualizer change page (if they are different from loading)
        navigate(
          `/jobs/${job.id}/${jobResultSection.VISUALIZER}/${encodeURIComponent(
            UIElements[0].id,
          )}`,
        );
      } else if (subSection === NO_VISUALIZER_UI_ELEMENT_CODE) {
        console.debug("navigate to raw data - analyzer");
        // in case there is no visualizer redirect to raw data
        navigate(
          `/jobs/${job.id}/${jobResultSection.RAW}/${rawElements[0].id}`,
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [UIElements]);

  const elementsToShow = isSelectedUI ? UIElements : rawElements;
  return (
    <Loader
      loading={UIElements.length === 0}
      render={() => (
        <Container fluid>
          {/* bar with job id and utilities buttons */}
          <Row className="g-0 d-flex-between-end" id="utilitiesRow">
            <Col>
              <GoBackButton onlyIcon color="gray" />
              <h2>
                <span className="me-2 text-secondary">Job #{job.id}</span>
                <StatusIcon status={job.status} className="small" />
              </h2>
            </Col>
            <Col className="d-flex justify-content-end">
              <JobActionsBar job={job} />
            </Col>
          </Row>
          {/* job metadata card */}
          <Row className="g-0">
            <Col>
              <JobInfoCard job={job} />
            </Col>
          </Row>
          {isRunningJob && (
            <Row>
              <JobIsRunningAlert job={job} />
            </Row>
          )}
          <Row className="g-0 mt-3">
            <div className="mb-2 d-inline-flex flex-row-reverse">
              {/* UI/raw switch */}
              <ButtonGroup className="ms-2 mb-3">
                <Button
                  outline={!isSelectedUI}
                  color={isSelectedUI ? "primary" : "tertiary"}
                  onClick={() =>
                    navigate(
                      `/jobs/${job.id}/${
                        jobResultSection.VISUALIZER
                      }/${encodeURIComponent(UIElements[0].id)}`,
                      { state: { userChanged: true } },
                    )
                  }
                >
                  {jobResultSection.VISUALIZER.charAt(0).toUpperCase() +
                    jobResultSection.VISUALIZER.slice(1)}
                </Button>
                <Button
                  outline={isSelectedUI}
                  color={!isSelectedUI ? "primary" : "tertiary"}
                  onClick={() =>
                    navigate(
                      `/jobs/${job.id}/${jobResultSection.RAW}/${rawElements[0].id}`,
                      { state: { userChanged: true } },
                    )
                  }
                >
                  {jobResultSection.RAW.charAt(0).toUpperCase() +
                    jobResultSection.RAW.slice(1)}
                </Button>
              </ButtonGroup>
              <div className="flex-fill horizontal-scrollable">
                <Nav tabs className="flex-nowrap h-100">
                  {/* generate the nav with the UI/raw visualizers avoid to generate the navbar item for the "no visualizer element" */}
                  {elementsToShow.map(
                    (componentsObject) =>
                      componentsObject.id !== "" && (
                        <NavItem>
                          <NavLink
                            className={`${
                              // ignore the loading id or the "active" class create an empty block in the navbar
                              subSection === componentsObject.id &&
                              componentsObject.id !== ""
                                ? "active"
                                : ""
                            }`}
                            onClick={() =>
                              navigate(
                                `/jobs/${
                                  job.id
                                }/${section}/${encodeURIComponent(
                                  componentsObject.id,
                                )}`,
                                { state: { userChanged: true } },
                              )
                            }
                          >
                            {componentsObject.nav}
                          </NavLink>
                        </NavItem>
                      ),
                  )}
                </Nav>
              </div>
            </div>
            {/* reports section */}
            <TabContent activeTab={subSection}>
              {elementsToShow.map((componentsObject) => (
                <TabPane
                  tabId={componentsObject.id}
                  id={`jobReportTab${componentsObject.id}`}
                >
                  {componentsObject.report}
                </TabPane>
              ))}
            </TabContent>
          </Row>
        </Container>
      )}
    />
  );
}

JobOverview.propTypes = {
  isRunningJob: PropTypes.bool.isRequired,
  job: PropTypes.object.isRequired,
  refetch: PropTypes.func.isRequired,
  section: PropTypes.string.isRequired,
  subSection: PropTypes.string.isRequired,
};
