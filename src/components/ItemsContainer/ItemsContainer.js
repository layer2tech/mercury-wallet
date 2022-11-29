import { CoinsList } from "..";
import ChannelList from '../Channels/ChannelList';

const ItemsContainer = (props) => {
    return(
        <div className="Body left ">
            <>
                {(props.coinsListProps ?
                    <div>
                        <h3 className = "subtitle" > {props.coinsListProps.title} </h3>
                        <span className = "sub" > {props.coinsListProps.subtitle} </span>
                        <CoinsList
                            displayDetailsOnClick={false}
                            showCoinStatus={true}
                            selectedCoins={props.coinsListProps.selectedCoins}
                            setSelectedCoin={props.coinsListProps.setSelectedCoin}
                            setCoinDetails={props.coinsListProps.setCoinDetails}
                            refresh={props.coinsListProps.refreshCoins}
                            render = {props.coinsListProps.forceRender} />
                    </div>
                    :
                    <div>
                        <h3 className = "subtitle" > {props.channelListProps.title} </h3>
                        <ChannelList />
                    </div>
                )}
            </>
          </div>
    );
};

export default ItemsContainer;