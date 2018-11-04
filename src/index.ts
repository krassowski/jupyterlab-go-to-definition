import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';


/**
 * Initialization data for the jupyterlab_go_to_definition extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab_go_to_definition',
  autoStart: true,
  activate: (app: JupyterLab) => {
    console.log('JupyterLab extension jupyterlab_go_to_definition is activated!');
  }
};

export default extension;
