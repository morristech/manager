import * as moment from 'moment-timezone';
import { InjectedNotistackProps, withSnackbar } from 'notistack';
import { path, pathOr, sortBy } from 'ramda';
import * as React from 'react';
import { connect, MapStateToProps } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { compose } from 'recompose';
import 'rxjs/add/operator/filter';
import { Subscription } from 'rxjs/Subscription';
import VolumeIcon from 'src/assets/addnewmenu/volume.svg';
import ActionsPanel from 'src/components/ActionsPanel';
import Button from 'src/components/Button';
import ConfirmationDialog from 'src/components/ConfirmationDialog';
import FormControl from 'src/components/core/FormControl';
import FormHelperText from 'src/components/core/FormHelperText';
import InputLabel from 'src/components/core/InputLabel';
import MenuItem from 'src/components/core/MenuItem';
import Paper from 'src/components/core/Paper';
import { StyleRulesCallback, withStyles, WithStyles } from 'src/components/core/styles';
import TableBody from 'src/components/core/TableBody';
import TableHead from 'src/components/core/TableHead';
import TableRow from 'src/components/core/TableRow';
import Tooltip from 'src/components/core/Tooltip';
import Typography from 'src/components/core/Typography';
import { DocumentTitleSegment } from 'src/components/DocumentTitle';
import Placeholder from 'src/components/Placeholder';
import PromiseLoader, { PromiseLoaderResponse } from 'src/components/PromiseLoader';
import Select from 'src/components/Select';
import Table from 'src/components/Table';
import TableCell from 'src/components/TableCell';
import TextField from 'src/components/TextField';
import { events$, resetEventsPolling } from 'src/events';
import { linodeInTransition as isLinodeInTransition } from 'src/features/linodes/transitions';
import { cancelBackups, enableBackups, getLinodeBackups, getType, takeSnapshot } from 'src/services/linodes';
import { getAPIErrorOrDefault } from 'src/utilities/errorUtils';
import getAPIErrorFor from 'src/utilities/getAPIErrorFor';
import scrollErrorIntoView from 'src/utilities/scrollErrorIntoView';
import { withLinode } from '../context';
import BackupTableRow from './BackupTableRow';
import { updateBackupsWindow } from './backupUtils';
import RestoreToLinodeDrawer from './RestoreToLinodeDrawer';

type ClassNames =
  'paper'
  | 'title'
  | 'subTitle'
  | 'snapshotFormControl'
  | 'scheduleAction'
  | 'chooseTime'
  | 'cancelButton';

const styles: StyleRulesCallback<ClassNames> = (theme) => ({
  paper: {
    padding: theme.spacing.unit * 3,
    marginBottom: theme.spacing.unit * 3,
  },
  title: {
    marginTop: theme.spacing.unit,
    marginBottom: theme.spacing.unit * 2,
  },
  subTitle: {
    marginBottom: theme.spacing.unit,
  },
  snapshotFormControl: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    '& > div': {
      width: 'auto',
      marginRight: theme.spacing.unit * 2,
    },
  },
  scheduleAction: {
    padding: 0,
    '& button': {
      marginLeft: 0,
      marginTop: theme.spacing.unit * 2,
    },
  },
  chooseTime: {
    marginRight: theme.spacing.unit * 2,
  },
  cancelButton: {
    marginBottom: theme.spacing.unit,
  },
});

interface ContextProps {
  linodeID: number;
  linodeRegion: string;
  linodeType: null | string;
  backupsEnabled: boolean;
  backupsSchedule: Linode.LinodeBackupSchedule;
  linodeInTransition: boolean;
  linodeLabel: string;
}

interface PreloadedProps {
  backups: PromiseLoaderResponse<Linode.LinodeBackupsResponse>;
  type: PromiseLoaderResponse<Linode.LinodeType>;
}

interface State {
  backups: Linode.LinodeBackupsResponse;
  snapshotForm: {
    label: string;
    errors?: Linode.ApiFieldError[];
  };
  settingsForm: {
    window: Linode.Window;
    day: Linode.Day;
    errors?: Linode.ApiFieldError[];
  };
  restoreDrawer: {
    open: boolean;
    backupCreated: string;
    backupID?: number;
  };
  cancelBackupsAlertOpen: boolean;
  enabling: boolean;
}

type CombinedProps = PreloadedProps
  & StateProps
  & WithStyles<ClassNames>
  & RouteComponentProps<{}>
  & ContextProps
  & InjectedNotistackProps;

const evenize = (n: number): number => {
  if (n === 0) { return n; }
  return (n % 2 === 0) ? n : n - 1;
};

export const aggregateBackups = (backups: Linode.LinodeBackupsResponse): Linode.LinodeBackup[] => {
  const manualSnapshot = path(['status'], backups.snapshot.in_progress) === 'needsPostProcessing'
    ? backups.snapshot.in_progress
    : backups.snapshot.current;
  return backups && [...backups.automatic!, manualSnapshot!].filter(b => Boolean(b));
};

export const formatBackupDate = (backupDate: string) => {
  return moment.utc(backupDate).local().fromNow();
}

class LinodeBackup extends React.Component<CombinedProps, State> {
  state: State = {
    backups: this.props.backups.response,
    snapshotForm: {
      label: '',
    },
    settingsForm: {
      window: this.props.backupsSchedule.window || 'Scheduling',
      day: this.props.backupsSchedule.day || 'Scheduling',
    },
    restoreDrawer: {
      open: false,
      backupCreated: '',
    },
    cancelBackupsAlertOpen: false,
    enabling: false,
  };

  windows: string[][] = [];
  days: string[][] = [];

  eventSubscription: Subscription;

  mounted: boolean = false;

  componentDidMount() {
    this.mounted = true;
    this.eventSubscription = events$
      .filter(e => [
        'linode_snapshot',
        'backups_enable',
        'backups_cancel',
        'backups_restore',
      ].includes(e.action))
      .filter(e => !e._initial && e.status === 'finished')
      .subscribe((e) => {
        getLinodeBackups(this.props.linodeID)
          .then((data) => {
            this.setState({ backups: data });
          })
          .catch(() => {
            /* @todo: how do we want to display this error? */
            this.setState({ enabling: false })
          });
      });
    const { enableOnLoad } = pathOr(false, ['location', 'state'], this.props);
    if (enableOnLoad && !this.props.backupsEnabled) { this.enableBackups(); }
  }

  componentWillUnmount() {
    this.mounted = false;
    this.eventSubscription.unsubscribe();
  }

  initWindows(timezone: string) {
    let windows = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((hour) => {
      const start = moment.utc({ hour }).tz(timezone);
      const finish = moment.utc({ hour }).add(moment.duration({ hours: 2 })).tz(timezone);
      return [
        `${start.format('HH:mm')} - ${finish.format('HH:mm')}`,
        `W${evenize(+moment.utc({ hour }).format('H'))}`,
      ];
    });

    windows = sortBy<string[]>(window => window[0], windows);

    windows.unshift(['Choose a time', 'Scheduling']);

    return windows;
  }

  constructor(props: CombinedProps) {
    super(props);

    /* TODO: use the timezone from the user's profile */
    this.windows = this.initWindows(this.props.timezone);

    this.days = [
      ['Choose a day', 'Scheduling'],
      ['Sunday', 'Sunday'],
      ['Monday', 'Monday'],
      ['Tuesday', 'Tuesday'],
      ['Wednesday', 'Wednesday'],
      ['Thursday', 'Thursday'],
      ['Friday', 'Friday'],
      ['Saturday', 'Saturday'],
    ];
  }

  enableBackups = () => {
    this.setState({ enabling: true });
    const { linodeID, enqueueSnackbar } = this.props;
    enableBackups(linodeID)
      .then(() => {
        // There is no event for when backups have been enabled,
        // so we don't reset the enabling state.
        enqueueSnackbar('Backups are being enabled for this Linode', {
          variant: 'info'
        })
        resetEventsPolling();
      })
      .catch((errorResponse) => {
        getAPIErrorOrDefault(errorResponse)
          .forEach((err: Linode.ApiFieldError) => enqueueSnackbar(err.reason, {
            variant: 'error'
          }));
        this.setState({ enabling: false });
      });
  }

  cancelBackups = () => {
    const { enqueueSnackbar } = this.props;
    cancelBackups(this.props.linodeID)
      .then(() => {
        enqueueSnackbar('Backups are being cancelled for this Linode', {
          variant: 'info'
        });
        // Just in case the user immediately disables backups
        // and enabling is still true:
        this.setState({ enabling: false, })
        resetEventsPolling();
      })
      .catch((errorResponse) => {
        getAPIErrorOrDefault(errorResponse, 'There was an error disabling backups')
          /**  @todo move this error to the actual modal */
          .forEach((err: Linode.ApiFieldError) => enqueueSnackbar(err.reason, {
            variant: 'error'
          }));
      });
    if (!this.mounted) { return; }
    this.setState({ cancelBackupsAlertOpen: false });
  }

  takeSnapshot = () => {
    const { linodeID, enqueueSnackbar } = this.props;
    const { snapshotForm } = this.state;
    takeSnapshot(linodeID, snapshotForm.label)
      .then(() => {
        enqueueSnackbar('A snapshot is being taken', {
          variant: 'info'
        });
        this.setState({ snapshotForm: { label: '', errors: undefined } });
        resetEventsPolling();
      })
      .catch((errorResponse) => {
        getAPIErrorOrDefault(
          errorResponse,
          'There was an error taking a snapshot',
        )
          .forEach((err: Linode.ApiFieldError) => enqueueSnackbar(err.reason, {
            variant: 'error'
          }));
      });
  }

  saveSettings = () => {
    const { linodeID, enqueueSnackbar } = this.props;
    const { settingsForm } = this.state;

    updateBackupsWindow(linodeID, settingsForm.day, settingsForm.window)
      .then(() => {
        enqueueSnackbar('Backup settings saved', {
          variant: 'success'
        });
      })
      .catch((err) => {
        this.setState({
          settingsForm: {
            ...settingsForm,
            errors: getAPIErrorOrDefault(err),
          },
        }, () => {
          scrollErrorIntoView();
        });
      });
  }

  openRestoreDrawer = (backupID: number, backupCreated: string) => {
    this.setState({
      restoreDrawer:
        { open: true, backupID, backupCreated },
    });
  }

  closeRestoreDrawer = () => {
    this.setState({ restoreDrawer: { open: false, backupID: undefined, backupCreated: '' } });
  }

  handleSelectBackupWindow = (e: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      settingsForm:
        { ...this.state.settingsForm, window: e.target.value as Linode.Window },
    })
  }

  handleSelectBackupTime = (e: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      settingsForm:
        { ...this.state.settingsForm, day: e.target.value as Linode.Day },
    })
  }

  handleSnapshotNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ snapshotForm: { label: e.target.value } });
  }

  handleCloseBackupsAlert = () => {
    this.setState({ cancelBackupsAlertOpen: false });
  }

  handleOpenBackupsAlert = () => {
    this.setState({ cancelBackupsAlertOpen: true });
  }

  handleDeploy = (backup: Linode.LinodeBackup) => {
    const { history, linodeID } = this.props;
    history.push('/linodes/create'
      + `?type=fromBackup&backupID=${backup.id}&linodeID=${linodeID}`);
  }

  handleRestore = (backup: Linode.LinodeBackup) => {
    this.openRestoreDrawer(
      backup.id,
      formatBackupDate(backup.created),
    )
  }

  handleRestoreSubmit = () => {
    this.closeRestoreDrawer();
    this.props.enqueueSnackbar('Backup restore started', {
      variant: 'info'
    });
  }

  Placeholder = (): JSX.Element | null => {
    const { enabling } = this.state;
    const backupsMonthlyPrice = path<number>(
      ['types', 'response', 'addons', 'backups', 'price', 'monthly'],
      this.props,
    );

    const backupPlaceholderText = backupsMonthlyPrice
      ? <React.Fragment>Three backup slots are executed and rotated automatically: a daily backup, a 2-7 day old backup, and 8-14 day old backup. To enable backups for just <strong>${backupsMonthlyPrice} per month</strong>, click below.</React.Fragment>
      : 'Three backup slots are executed and rotated automatically: a daily backup, a 2-7 day old backup, and 8-14 day old backup. To enable backups just click below.'

    return (
      <Placeholder
        icon={VolumeIcon}
        title="Backups"
        copy={backupPlaceholderText}
        buttonProps={{
          onClick: () => this.enableBackups(),
          children: 'Enable Backups',
          loading: enabling,
        }}
      />
    );
  }

  Table = ({ backups }: { backups: Linode.LinodeBackup[] }): JSX.Element | null => {
    const { classes } = this.props;

    return (
      <React.Fragment>
        <Paper className={classes.paper} style={{ padding: 0 }}>
          <Table aria-label="List of Backups">
            <TableHead>
              <TableRow>
                <TableCell>Date Created</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Disks</TableCell>
                <TableCell>Space Required</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {backups.map((backup: Linode.LinodeBackup, idx: number) =>
                <BackupTableRow
                  key={idx}
                  backup={backup}
                  handleDeploy={this.handleDeploy}
                  handleRestore={this.handleRestore}
                />
              )}
            </TableBody>
          </Table>
        </Paper>
      </React.Fragment>
    );
  }

  SnapshotForm = (): JSX.Element | null => {
    const { classes, linodeInTransition } = this.props;
    const { snapshotForm } = this.state;
    const getErrorFor = getAPIErrorFor({ label: 'Label' }, snapshotForm.errors);

    return (
      <React.Fragment>
        <Paper className={classes.paper}>
          <Typography
            role="header"
            variant="h2"
            className={classes.subTitle}
            data-qa-manual-heading
          >
            Manual Snapshot
          </Typography>
          <Typography variant="body1" data-qa-manual-desc>
            You can make a manual backup of your Linode by taking a snapshot.
            Creating the manual snapshot can take serval minutes, depending on
            the size of your Linode and the amount of data you have stored on
            it.
          </Typography>
          <FormControl className={classes.snapshotFormControl}>
            <TextField
              errorText={getErrorFor('label')}
              label="Name Snapshot"
              value={snapshotForm.label || ''}
              onChange={this.handleSnapshotNameChange}
              data-qa-manual-name
            />
            <Tooltip title={linodeInTransition
              ? 'This Linode is busy'
              : ''
            }>
              <div>
                <Button
                  type="primary"
                  onClick={this.takeSnapshot}
                  data-qa-snapshot-button
                  disabled={linodeInTransition}
                >
                  Take Snapshot
                </Button>
              </div>
            </Tooltip>
            {getErrorFor('none') &&
              <FormHelperText error>{getErrorFor('none')}</FormHelperText>
            }
          </FormControl>
        </Paper>
      </React.Fragment>
    );
  }

  SettingsForm = (): JSX.Element | null => {
    const { classes } = this.props;
    const { settingsForm } = this.state;
    const getErrorFor = getAPIErrorFor(
      { day: 'backups.day', window: 'backups.window', schedule: 'backups.schedule.window' },
      settingsForm.errors);
    const errorText = getErrorFor('none')
      || getErrorFor('backups.day')
      || getErrorFor('backups.window')
      || getErrorFor('backups.schedule.window')
      || getErrorFor('backups.schedule.day');

    return (
      <React.Fragment>
        <Paper className={classes.paper}>
          <Typography
            role="header"
            variant="h2"
            className={classes.subTitle}
            data-qa-settings-heading>
            Settings
          </Typography>
          <Typography variant="body1" data-qa-settings-desc>
            Configure when automatic backups are initiated. The Linode Backup
            Service will generate backups between the selected hours. The
            selected day is when the backup is promoted to the weekly slot.
          </Typography>
          <FormControl className={classes.chooseTime}>
            <InputLabel htmlFor="window">
              Time of Day
            </InputLabel>
            <Select
              value={settingsForm.window}
              onChange={this.handleSelectBackupWindow}
              inputProps={{ name: 'window', id: 'window' }}
              data-qa-time-select
            >
              {this.windows.map((window: Linode.Window[]) => (
                <MenuItem key={window[0]} value={window[1]}>
                  {window[0]}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Windows displayed in {this.props.timezone}</FormHelperText>
          </FormControl>

          <FormControl>
            <InputLabel htmlFor="day">
              Day of Week
            </InputLabel>
            <Select
              value={settingsForm.day}
              onChange={this.handleSelectBackupTime}
              inputProps={{ name: 'day', id: 'day' }}
              data-qa-weekday-select
            >
              {this.days.map((day: string[]) => (
                <MenuItem key={day[0]} value={day[1]}>
                  {day[0]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ActionsPanel className={classes.scheduleAction}>
            <Button
              type="primary"
              onClick={this.saveSettings}
              data-qa-schedule
            >
              Save Schedule
            </Button>
          </ActionsPanel>
          {errorText &&
            <FormHelperText error>{errorText}</FormHelperText>
          }
        </Paper>
      </React.Fragment>
    );
  }

  Management = (): JSX.Element | null => {
    const { classes, linodeID, linodeRegion } = this.props;
    const { backups: backupsResponse } = this.state;
    const backups = aggregateBackups(backupsResponse);

    return (
      <React.Fragment>
        <Typography
          role="header"
          variant="h2"
          className={classes.title}
          data-qa-title
        >
          Backups
        </Typography>
        {backups.length
          ? <this.Table backups={backups} />
          : <Paper className={classes.paper} data-qa-backup-description>
            <Typography>Automatic and manual backups will be listed here</Typography>
          </Paper>
        }
        <this.SnapshotForm />
        <this.SettingsForm />
        <Button
          type="secondary"
          destructive
          className={classes.cancelButton}
          onClick={this.handleOpenBackupsAlert}
          data-qa-cancel
        >
          Cancel Backups
        </Button>
        <Typography
          variant="body2"
          data-qa-cancel-desc
        >
          Please note that when you cancel backups associated with this
          Linode, this will remove all existing backups.
        </Typography>
        <RestoreToLinodeDrawer
          open={this.state.restoreDrawer.open}
          linodeID={linodeID}
          linodeRegion={linodeRegion}
          backupID={this.state.restoreDrawer.backupID}
          backupCreated={this.state.restoreDrawer.backupCreated}
          onClose={this.closeRestoreDrawer}
          onSubmit={this.handleRestoreSubmit}
        />
        <ConfirmationDialog
          title="Confirm Cancellation"
          actions={this.renderConfirmCancellationActions}
          open={this.state.cancelBackupsAlertOpen}
          onClose={this.handleCloseBackupsAlert}
        >
          Cancelling backups associated with this Linode will
           delete all existing backups. Are you sure?
        </ConfirmationDialog>
      </React.Fragment>
    );
  }


  renderConfirmCancellationActions = () => {
    return (
      <ActionsPanel style={{ padding: 0 }}>
        <Button type="cancel" onClick={this.handleCloseBackupsAlert} data-qa-cancel-cancel>
          Close
        </Button>
        <Button type="secondary" destructive onClick={this.cancelBackups} data-qa-confirm-cancel>
          Cancel Backups
        </Button>
      </ActionsPanel>
    );
  }


  render() {
    const { backupsEnabled, linodeLabel } = this.props;

    return (
      <React.Fragment>
        <DocumentTitleSegment segment={`${linodeLabel} - Backups`} />
        {backupsEnabled
          ? <this.Management />
          : <this.Placeholder />
        }
      </React.Fragment>
    );
  }
}

const preloaded = PromiseLoader<ContextProps>({
  backups: (props) => getLinodeBackups(props.linodeID),
  types: ({ linodeType }) => {
    if (!linodeType) {
      return Promise.resolve(undefined);
    }

    return getType(linodeType);
  },
});

const styled = withStyles(styles);

interface StateProps {
  timezone: string;
}

const mapStateToProps: MapStateToProps<StateProps, {}, ApplicationState> = (state) => ({
  timezone: pathOr('GMT', ['data', 'timezone'], state.__resources.profile),
});

const connected = connect(mapStateToProps);

const linodeContext = withLinode((context) => ({
  backupsEnabled: context.data!.backups.enabled,
  backupsSchedule: context.data!.backups.schedule,
  linodeID: context.data!.id,
  linodeInTransition: isLinodeInTransition(context.data!.status),
  linodeLabel: context.data!.label,
  linodeRegion: context.data!.region,
  linodeType: context.data!.type,
}));

export default compose<CombinedProps, {}>(
  linodeContext,
  preloaded,
  styled as any,
  withRouter,
  connected,
  withSnackbar
)(LinodeBackup);
