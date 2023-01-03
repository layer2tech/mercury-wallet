class MercuryLogger {
  log(record) {
    console.log('Logged Here..')
    console.log(record.get_module_path() + ": " + record.get_args());
  }
}

export default MercuryLogger;
