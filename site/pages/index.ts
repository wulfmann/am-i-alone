import { useAlone } from 'am-i-alone';

function Home() {
  const { alone, count } = useAlone();
  
  const verb = count === 1 ? 'is' : 'are';
  const suffix = count === 1 ? '' : 's';
  const text = alone ? 'yes' : 'no';
  return (
    <div>
      <div>{text}</div>
      <div>{!alone && `There ${verb} ${count} other${suffix}}</div>
    </div>
  );
};

export default Home;
