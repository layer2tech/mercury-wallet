function worker () {

    onmessage = function (e) {
        const interval = this.setInterval(() =>{
            this.postMessage('Arg');
        }, e.data)

    }

}

export default worker;