import withWidth, { WithWidth } from '@material-ui/core/withWidth';
import { InjectedNotistackProps, withSnackbar } from 'notistack';
import { parse, stringify } from 'qs';
import { pathOr } from 'ramda';
import * as React from 'react';
import { connect, MapStateToProps } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { compose, withStateHandlers } from 'recompose';
import ActionsPanel from 'src/components/ActionsPanel';
import Button from 'src/components/Button';
import CircleProgress from 'src/components/CircleProgress';
import ConfirmationDialog from 'src/components/ConfirmationDialog';
import FormControlLabel from 'src/components/core/FormControlLabel';
import Hidden from 'src/components/core/Hidden';
import Typography from 'src/components/core/Typography';
import setDocs, { SetDocsProps } from 'src/components/DocsSidebar/setDocs';
import { DocumentTitleSegment } from 'src/components/DocumentTitle';
import ErrorState from 'src/components/ErrorState';
import Grid from 'src/components/Grid';
import OrderBy from 'src/components/OrderBy';
import Toggle from 'src/components/Toggle';
import withImages from 'src/containers/withImages.container';
import { LinodeGettingStarted, SecuringYourServer } from 'src/documentation';
import LinodeConfigSelectionDrawer, { LinodeConfigSelectionDrawerCallback } from 'src/features/LinodeConfigSelectionDrawer';
import { sendEvent } from 'src/utilities/analytics';
import { storage, views } from 'src/utilities/storage';
import CardView from './CardView';
import DisplayGroupedLinodes from './DisplayGroupedLinodes';
import DisplayLinodes from './DisplayLinodes';
import styled, { StyleProps } from './LinodesLanding.styles';
import ListLinodesEmptyState from './ListLinodesEmptyState';
import ListView from './ListView';
import { powerOffLinode, rebootLinode } from './powerActions';
import ToggleBox from './ToggleBox';

interface ConfigDrawerState {
  open: boolean;
  configs: Linode.Config[];
  error?: string;
  selected?: number;
  action?: LinodeConfigSelectionDrawerCallback;
}

interface State {
  configDrawer: ConfigDrawerState;
  powerAlertOpen: boolean;
  bootOption: Linode.BootAction;
  selectedLinodeId: number | null;
  selectedLinodeLabel: string;
  groupByTag: boolean;
}

interface Params {
  view?: string;
  groupByTag?: 'true' | 'false';
}

type RouteProps = RouteComponentProps<Params>

type CombinedProps =
  & WithImagesProps
  & WithWidth
  & ToggleGroupByTagsProps
  & StateProps
  & RouteProps
  & StyleProps
  & SetDocsProps
  & InjectedNotistackProps;

export class ListLinodes extends React.Component<CombinedProps, State> {
  static eventCategory = 'linodes landing';

  state: State = {
    configDrawer: {
      open: false,
      configs: [],
      error: undefined,
      selected: undefined,
      action: (id: number) => null,
    },
    powerAlertOpen: false,
    bootOption: null,
    selectedLinodeId: null,
    selectedLinodeLabel: '',
    groupByTag: false,
  };

  static docs = [
    LinodeGettingStarted,
    SecuringYourServer,
  ];

  openConfigDrawer = (configs: Linode.Config[], action: LinodeConfigSelectionDrawerCallback) => {
    this.setState({
      configDrawer: {
        open: true,
        configs,
        selected: configs[0].id,
        action,
      },
    });
  }

  closeConfigDrawer = () => {
    this.setState({
      configDrawer: {
        open: false,
        configs: [],
        error: undefined,
        selected: undefined,
        action: (id: number) => null,
      },
    });
  }

  changeView = (style: 'grid' | 'list') => {
    const { history, location } = this.props;

    const updatedParams = updateParams<Params>(location.search, (params) => ({ ...params, view: style }));

    history.push(`?${updatedParams}`);

    if (style === 'grid') {
      views.linode.set('grid');
    } else {
      views.linode.set('list');
    }

    sendEvent({
      category: ListLinodes.eventCategory,
      action: 'switch view',
      label: style
    })
  }

  selectConfig = (id: number) => {
    this.setState(prevState => ({
      configDrawer: {
        ...prevState.configDrawer,
        selected: id,
      },
    }));
  }

  submitConfigChoice = () => {
    const { action, selected } = this.state.configDrawer;
    if (selected && action) {
      action(selected);
      this.closeConfigDrawer();
    }
  }

  toggleDialog = (
    bootOption: Linode.BootAction,
    selectedLinodeId: number,
    selectedLinodeLabel: string,
  ) => {
    this.setState({
      powerAlertOpen: !this.state.powerAlertOpen,
      selectedLinodeId,
      selectedLinodeLabel,
      bootOption,
    });
  }

  rebootOrPowerLinode = () => {
    const { bootOption, selectedLinodeId, selectedLinodeLabel } = this.state;
    if (bootOption === 'reboot') {
      rebootLinode(
        this.openConfigDrawer,
        selectedLinodeId!,
        selectedLinodeLabel,
        this.props.enqueueSnackbar,
      );
    } else {
      powerOffLinode(selectedLinodeId!, selectedLinodeLabel);
    }
    this.setState({ powerAlertOpen: false });
  }

  render() {
    const {
      imagesError,
      imagesLoading,
      linodesRequestError,
      linodesRequestLoading,
      linodesCount,
      linodesData,
      groupByTags,
      width,
      classes
    } = this.props;

    const {
      configDrawer,
      bootOption,
      powerAlertOpen,
    } = this.state;

    const params: Params = parse(this.props.location.search, { ignoreQueryPrefix: true });

    const userSelectedDisplay = getUserSelectedDisplay(params.view);

    const display: 'grid' | 'list' = getDisplayType(width, linodesCount, userSelectedDisplay);

    const component = display === 'grid' ? CardView : ListView;

    const componentProps = {
      openConfigDrawer: this.openConfigDrawer,
      toggleConfirmation: this.toggleDialog,
      display,
      component,
      count: linodesCount,
    };

    if (imagesError || linodesRequestError) {
      return (
        <React.Fragment>
          <DocumentTitleSegment segment="Linodes" />
          <ErrorState errorText="Error loading data" />
        </React.Fragment>
      );
    }

    if (linodesRequestLoading || imagesLoading) {
      return <CircleProgress />;
    }

    if (this.props.linodesCount === 0) {
      return <ListLinodesEmptyState />
    }

    return (
      <Grid container>
        <DocumentTitleSegment segment="Linodes" />
        <Grid container justify="space-between" item xs={12}>
          <Grid item className={classes.title}>
            <Typography
              role="header"
              variant="h1"
              className={this.props.classes.title}
              data-qa-title
            >
              Linodes
          </Typography>
          </Grid>
          <Hidden smDown>
            <FormControlLabel
              className={classes.tagGroup}
              control={
                <Toggle
                  className={(this.props.groupByTags ? ' checked' : ' unchecked')}
                  onChange={this.props.toggleGroupByTag}
                  checked={this.props.groupByTags} />
              }
              label="Group by Tag:"
            />
            <ToggleBox handleClick={this.changeView} status={display} />
          </Hidden>
        </Grid>
        <Grid item xs={12}>
          <OrderBy data={linodesData} order={'asc'} orderBy={'label'}>
            {({ data, handleOrderChange, order, orderBy }) => {
              const finalProps = {
                ...componentProps,
                data,
                handleOrderChange,
                order,
                orderBy,
              }
              const render = groupByTags
                ? <DisplayGroupedLinodes {...finalProps} />
                : <DisplayLinodes {...finalProps} />;

              return render;
            }}
          </OrderBy>
        </Grid>
        <LinodeConfigSelectionDrawer
          onClose={this.closeConfigDrawer}
          onSubmit={this.submitConfigChoice}
          onChange={this.selectConfig}
          open={configDrawer.open}
          configs={configDrawer.configs}
          selected={String(configDrawer.selected)}
          error={configDrawer.error}
        />
        <ConfirmationDialog
          title={(bootOption === 'reboot') ? 'Confirm Reboot' : 'Powering Off'}
          actions={this.renderConfirmationActions}
          open={powerAlertOpen}
          onClose={this.closePowerAlert}
        >
          <Typography>
            {bootOption === 'reboot'
              ? 'Are you sure you want to reboot your Linode?'
              : 'Are you sure you want to power down your Linode?'
            }
          </Typography>
        </ConfirmationDialog>
      </Grid>
    );
  }

  renderConfirmationActions = () => {
    const { bootOption } = this.state;
    return (
      <ActionsPanel style={{ padding: 0 }}>
        <Button
          type="cancel"
          onClick={this.closePowerAlert}
          data-qa-cancel-cancel
        >
          Cancel
        </Button>
        <Button
          type="primary"
          onClick={this.rebootOrPowerLinode}
          data-qa-confirm-cancel
        >
          {bootOption === 'reboot' ? 'Reboot' : 'Power Off'}
        </Button>
      </ActionsPanel>
    );
  };

  closePowerAlert = () => this.setState({ powerAlertOpen: false });
}

const getUserSelectedDisplay = (value?: string): undefined | 'grid' | 'list' => {
  /** Value comes from the URL */
  if (value) {
    return value === 'grid' ? 'grid' : 'list';
  }

  /* If local storage exists, set the view based on that */
  const localStorageValue = views.linode.get();
  if (localStorageValue !== null) {
    return localStorageValue;
  }

  return;
};

interface StateProps {
  managed: boolean;
  linodesCount: number;
  linodesData: Linode.Linode[];
  linodesRequestError?: Linode.ApiFieldError[];
  linodesRequestLoading: boolean;
}

const mapStateToProps: MapStateToProps<StateProps, {}, ApplicationState> = (state, ownProps) => {
  return {
    managed: pathOr(false, ['__resources', 'accountSettings', 'data', 'managed'], state),
    linodesCount: state.__resources.linodes.results.length,
    linodesData: state.__resources.linodes.entities,
    linodesRequestLoading: state.__resources.linodes.loading,
    linodesRequestError: state.__resources.linodes.error,
  }
};

interface ToggleGroupByTagsProps {
  groupByTags: boolean;
  toggleGroupByTag: (e: React.ChangeEvent<any>, checked: boolean) => void;
}

const connected = connect(mapStateToProps);

const toggleGroupState = withStateHandlers(
  (ownProps: RouteProps) => {
    const localStorageSelection = storage.views.grouped.get();
    return {
      groupByTags: localStorageSelection === undefined
        ? false
        : localStorageSelection
    }
  },
  {
    toggleGroupByTag: (state, ownProps) => (e, checked) => {
      storage.views.grouped.set(checked ? 'true' : 'false')
      return { ...state, groupByTags: checked };
    },
  },
);

const updateParams = <T extends any>(params: string, updater: (s: T) => T) => {
  const paramsAsObject: T = parse(params, { ignoreQueryPrefix: true });
  return stringify(updater(paramsAsObject));
};

const getDisplayType = (width: string, linodesCount: number, userSelect?: 'grid' | 'list') => {
  /**
   * We force the use of grid view at sm and xs viewports.
   */
  if (['sm', 'xs'].includes(width)) {
    return 'grid';
  }

  /**
   * If the user has made a selection (via URL param or localStorage) then use that value.
   */
  if (userSelect) {
    return userSelect;
  }

  /**
   * Default to choosing based on the total number of Linodes.
   * Note: Don't use data.length, otherwise the last page of 100000 Linodes will
   * display as a grid (and people don't like it).
   */
  return linodesCount >= 3 ? 'list' : 'grid';
};

interface WithImagesProps {
  imagesLoading: boolean;
  imagesError?: Linode.ApiFieldError[];
}

export const enhanced = compose(
  withRouter,
  toggleGroupState,
  styled,
  setDocs(ListLinodes.docs),
  withSnackbar,
  withWidth(),
  connected,
  withImages((ownProps,imagesData,imagesLoading,imagesError) => ({
    ...ownProps,
    imagesLoading,
    imagesError,
  }))
);

export default enhanced(ListLinodes);
